"use client";

import { useState, useCallback } from "react";
import { X, UploadCloud } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface UploadProps {
    refresh: () => Promise<void>;
    className?: string;
}

export function Upload({ refresh, className }: UploadProps) {
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
        prefix = parts.slice(2).join("/");
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

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

    async function uploadFileDirect(file: File) {
        const key = prefix ? `${prefix}/${file.name}` : file.name;

        // 1. init multipart
        const initRes = await fetch(`/api/upload/init`, {
            method: "POST",
            body: JSON.stringify({
                bucketId,
                key,
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

        let uploaded = 0;
        const parts: { PartNumber: number; ETag: string }[] = [];
        const CONCURRENCY = 10;
        let chunkIndex = 0;

        const uploadChunk = async () => {
            while (chunkIndex < chunks.length) {
                const index = chunkIndex++;
                const chunkInfo = chunks[index];
                const chunk = file.slice(chunkInfo.start, chunkInfo.start + chunkInfo.size);

                const res = await fetch(`/api/upload/upload-part?bucketId=${bucketId}&key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${chunkInfo.partNumber}`, {
                    method: "POST",
                    body: chunk,
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`Part ${chunkInfo.partNumber} upload failed: ${errorData.error || res.statusText}`);
                }

                const { etag } = await res.json();
                if (!etag) throw new Error("No ETag from server");

                parts.push({ PartNumber: chunkInfo.partNumber, ETag: etag });
                uploaded += chunkInfo.size;
                setProgress(Math.round((uploaded / file.size) * 100));
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

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "bg-green-600 text-white hover:bg-green-700",
                    className
                )}
            >
                <UploadCloud size={16} /> Upload
            </Button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => !uploading && setIsOpen(false)}
                >
                    <div
                        className="bg-accent rounded shadow-lg w-full max-w-md p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => !uploading && setIsOpen(false)}
                            className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-semibold mb-4">Upload Files</h2>

                        <div
                            className={`border-2 border-dashed rounded h-40 flex flex-col items-center justify-center text-gray-500 text-center cursor-pointer transition
                ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              `}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => document.getElementById("fileInput")?.click()}
                        >
                            {files.length === 0 ? (
                                <span>Drag & Drop files here or click to select</span>
                            ) : (
                                <ul className="text-sm text-left max-h-32 overflow-auto w-full px-2">
                                    {files.map((file, i) => (
                                        <li key={i}>{file.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {uploading && (
                            <div className="w-full mt-4">
                                <div className="bg-gray-200 rounded h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm mt-1">{progress}%</p>
                            </div>
                        )}

                        <input
                            id="fileInput"
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={uploading}
                                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={uploadFiles}
                                disabled={uploading || !files.length}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
