"use client";

import { useState, useCallback } from "react";
import { X, UploadCloud } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { normalizeFilename } from "@/lib/helpers"

export interface UploadProps {
    refresh: () => Promise<void>;
    addTimestamp: boolean;
    className?: string;
    method?: "proxy" | "direct";
}

export function Upload({ refresh, addTimestamp, className, method = "proxy" }: UploadProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);

    const pathname = usePathname();
    const parts = pathname.split("/").filter(Boolean);

    let bucketId = "";
    let prefix = "";
    if (parts[0] === "bucket") {
        bucketId = parts[1];
        prefix = parts.slice(2).map(decodeURIComponent).join("/");
    }

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

    async function uploadFileDirect(file: File) {
        const originalName = normalizeFilename(file.name, addTimestamp);
        const key = prefix ? `${prefix}/${originalName}` : originalName;

        // 1. init multipart
        let contentType = file.type;

        const initRes = await fetch(`/api/upload/init`, {
            method: "POST",
            body: JSON.stringify({
                bucketId,
                key,
                contentType: contentType || "application/octet-stream",
            }),
        }).then(r => r.json());

        const uploadId = initRes.uploadId;

        // 2. Prepare chunks
        const chunks: { start: number; partNumber: number; size: number }[] = [];
        let pNum = 1;
        for (let start = 0; start < file.size; start += CHUNK_SIZE) {
            chunks.push({
                start,
                partNumber: pNum++,
                size: Math.min(CHUNK_SIZE, file.size - start)
            });
        }

        const chunkProgress: Record<number, number> = {};
        const parts: { PartNumber: number; ETag: string }[] = [];
        const CONCURRENCY = 3;
        let chunkIndex = 0;

        const uploadChunk = async () => {
            while (chunkIndex < chunks.length) {
                const index = chunkIndex++;
                const chunkInfo = chunks[index];
                const chunk = file.slice(chunkInfo.start, chunkInfo.start + chunkInfo.size);

                let etag = "";

                if (method === "direct") {
                    // Direct CORS upload
                    const presignRes = await fetch(`/api/upload/presign-part`, {
                        method: "POST",
                        body: JSON.stringify({
                            bucketId,
                            key,
                            uploadId,
                            partNumber: chunkInfo.partNumber,
                        }),
                    }).then(r => r.json());

                    etag = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                chunkProgress[chunkInfo.partNumber] = e.loaded;
                                const totalUploaded = Object.values(chunkProgress).reduce((a, b) => a + b, 0);
                                setProgress(Math.min(100, Math.round((totalUploaded / file.size) * 100)));
                            }
                        };
                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(xhr.getResponseHeader("ETag")?.replace(/"/g, "") || "");
                            } else {
                                reject(new Error(`Part ${chunkInfo.partNumber} upload fail to S3: ${xhr.statusText}`));
                            }
                        };
                        xhr.onerror = () => reject(new Error(`Part ${chunkInfo.partNumber} upload fail to S3 network error`));
                        xhr.open("PUT", presignRes.url);
                        xhr.send(chunk);
                    });
                } else {
                    // Proxy upload
                    etag = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                chunkProgress[chunkInfo.partNumber] = e.loaded;
                                const totalUploaded = Object.values(chunkProgress).reduce((a, b) => a + b, 0);
                                setProgress(Math.min(100, Math.round((totalUploaded / file.size) * 100)));
                            }
                        };
                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    const data = JSON.parse(xhr.responseText);
                                    resolve(data.etag);
                                } catch (e) {
                                    reject(new Error("Invalid JSON response"));
                                }
                            } else {
                                let errMsg = xhr.statusText;
                                try {
                                    const errorData = JSON.parse(xhr.responseText);
                                    if (errorData.error) errMsg = errorData.error;
                                } catch (e) { }
                                reject(new Error(`Part ${chunkInfo.partNumber} upload fail to Proxy: ${errMsg}`));
                            }
                        };
                        xhr.onerror = () => reject(new Error(`Part ${chunkInfo.partNumber} upload fail to Proxy network error`));
                        xhr.open("POST", `/api/upload/upload-part?bucketId=${bucketId}&key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${chunkInfo.partNumber}`);
                        xhr.send(chunk);
                    });
                }

                if (!etag) throw new Error(`No ETag for part ${chunkInfo.partNumber}`);

                parts.push({ PartNumber: chunkInfo.partNumber, ETag: etag });

                // Finalize chunk progress in case XHR progress omitted the 100% event
                chunkProgress[chunkInfo.partNumber] = chunkInfo.size;
                const totalUploaded = Object.values(chunkProgress).reduce((a, b) => a + b, 0);
                setProgress(Math.min(100, Math.round((totalUploaded / file.size) * 100)));
            }
        };

        // 3. Upload chunks in parallel
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }).map(uploadChunk));

        // 4. Sort parts by number (S3 requirement)
        parts.sort((a, b) => a.PartNumber - b.PartNumber);

        // 5. complete
        await fetch(`/api/upload/complete`, {
            method: "POST",
            body: JSON.stringify({
                bucketId,
                key,
                uploadId,
                parts,
            }),
        });

        setProgress(100);
    }

    const uploadFiles = async () => {
        if (!files.length) return;
        setUploading(true);
        setProgress(0);

        for (const file of files) {
            await uploadFileDirect(file);
        }

        setUploading(false);
        setFiles([]);
        setIsOpen(false);
        await refresh();
    };

    const handleOpenChange = (open: boolean) => {
        if (!uploading) {
            setIsOpen(open);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className={className}
            >
                <UploadCloud className="size-4" />
                Upload
            </Button>

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent showCloseButton={!uploading}>
                    <DialogHeader>
                        <DialogTitle>Upload Files</DialogTitle>
                    </DialogHeader>

                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center text-muted-foreground text-center cursor-pointer transition-colors",
                            isDragging
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => document.getElementById("fileInput")?.click()}
                    >
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center gap-2">
                                <UploadCloud className="size-10 text-muted-foreground/50" />
                                <span className="text-sm">
                                    Drag & Drop files here or click to select
                                </span>
                            </div>
                        ) : (
                            <ScrollArea className="h-32 w-full px-4">
                                <ul className="space-y-1">
                                    {files.map((file, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center justify-between text-sm text-foreground bg-muted/50 rounded-md px-3 py-2"
                                        >
                                            <span className="truncate flex-1 mr-2">{file.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6 shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFile(i);
                                                }}
                                            >
                                                <X className="size-3" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        )}
                    </div>

                    {uploading && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-sm text-muted-foreground text-center">
                                {progress}% uploaded
                            </p>
                        </div>
                    )}

                    <input
                        id="fileInput"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={uploadFiles}
                            disabled={uploading || !files.length}
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
