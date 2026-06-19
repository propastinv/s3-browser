"use client"

import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

function splitKey(itemKey: string, isFolder: boolean): { prefix: string; name: string } {
    if (isFolder) {
        const withoutSlash = itemKey.slice(0, -1);
        const lastSlash = withoutSlash.lastIndexOf('/');
        if (lastSlash === -1) return { prefix: '', name: withoutSlash };
        return { prefix: withoutSlash.slice(0, lastSlash + 1), name: withoutSlash.slice(lastSlash + 1) };
    }
    const lastSlash = itemKey.lastIndexOf('/');
    if (lastSlash === -1) return { prefix: '', name: itemKey };
    return { prefix: itemKey.slice(0, lastSlash + 1), name: itemKey.slice(lastSlash + 1) };
}

const COMPOUND_EXTS = [
    '.tar.gz', '.tar.bz2', '.tar.xz', '.tar.zst', '.tar.lz', '.tar.lzma',
];

function splitExt(name: string): { base: string; ext: string } {
    const lower = name.toLowerCase();
    for (const compound of COMPOUND_EXTS) {
        if (lower.endsWith(compound)) {
            return { base: name.slice(0, -compound.length), ext: compound };
        }
    }
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return { base: name, ext: '' };
    return { base: name.slice(0, dot), ext: name.slice(dot) };
}

export function Rename({
    bucketId,
    itemKey,
    isFolder,
    refresh,
    className,
    label,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: {
    bucketId: string;
    itemKey: string;
    isFolder: boolean;
    refresh: () => void;
    className?: string;
    label?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [_isOpen, _setIsOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : _isOpen;
    const setIsOpen = (v: boolean) => {
        if (controlledOnOpenChange) controlledOnOpenChange(v);
        else _setIsOpen(v);
    };
    const isControlled = controlledOpen !== undefined;

    const [baseName, setBaseName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const { prefix, name: originalName } = splitKey(itemKey, isFolder);
    const { base: originalBase, ext } = isFolder ? { base: originalName, ext: '' } : splitExt(originalName);

    const destinationKey = prefix + baseName.trim() + ext + (isFolder ? '/' : '');

    useEffect(() => {
        if (isControlled && isOpen) {
            setBaseName(originalBase);
        }
    }, [isControlled, isOpen]);

    const renameClicked = async () => {
        const trimmed = baseName.trim();
        if (!trimmed) return;
        if (destinationKey === itemKey) {
            toast.error("New name must be different");
            return;
        }

        setIsRenaming(true);
        const toastId = toast.loading(`Renaming ${originalName}...`);

        try {
            const res = await fetch(`/api/bucket/${bucketId}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceKey: itemKey,
                    destinationKey,
                })
            });
            const data = await res.json();

            if (res.ok && data.jobId) {
                setIsOpen(false);

                pollRef.current = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`/api/bucket/${bucketId}/move/status?jobId=${data.jobId}`);
                        if (statusRes.ok) {
                            const job = await statusRes.json();

                            if (job.status === 'completed') {
                                clearInterval(pollRef.current!);
                                pollRef.current = null;
                                toast.success(`Renamed to ${trimmed} successfully`, { id: toastId });
                                refresh();
                                setIsRenaming(false);
                            } else if (job.status === 'error') {
                                clearInterval(pollRef.current!);
                                pollRef.current = null;
                                toast.error(`Failed to rename: ${job.error}`, { id: toastId });
                                setIsRenaming(false);
                            } else {
                                toast.loading(`Renaming ${originalName}...`, {
                                    id: toastId,
                                    classNames: { description: 'w-full', content: 'w-full flex-1', toast: 'w-full' },
                                    description: (
                                        <div className="flex flex-col gap-2 mt-2 w-full">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{job.processedItems} / {job.totalItems} copied</span>
                                                <span>{job.progress}%</span>
                                            </div>
                                            <Progress value={job.progress} className="h-1.5 w-full" />
                                        </div>
                                    ),
                                });
                            }
                        }
                    } catch {
                        // ignore poll error
                    }
                }, 1000);
            } else {
                toast.error(data.error || "Failed to start rename", { id: toastId });
                setIsRenaming(false);
            }
        } catch {
            toast.error("An error occurred during rename", { id: toastId });
            setIsRenaming(false);
        }
    };

    return (
        <>
            {!isControlled && (label ? (
                <Button
                    variant="outline"
                    className={`gap-2 ${className || ''}`}
                    onClick={() => { setBaseName(originalBase); setIsOpen(true); }}
                >
                    <Pencil className="size-4" />
                    {label}
                </Button>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${className || ''}`}
                            onClick={() => { setBaseName(originalBase); setIsOpen(true); }}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rename</TooltipContent>
                </Tooltip>
            ))}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename</DialogTitle>
                        <DialogDescription>
                            Enter a new name for <b>{originalName}</b>.
                            {isFolder && " The folder location will not change."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center">
                        {prefix && (
                            <span className="shrink-0 max-w-[40%] truncate rounded-l-md border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                                {prefix}
                            </span>
                        )}
                        <Input
                            type="text"
                            value={baseName}
                            onChange={(e) => setBaseName(e.target.value)}
                            placeholder="New name..."
                            className={`${prefix ? "rounded-l-none" : ""} ${ext ? "rounded-r-none" : ""}`}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") renameClicked();
                            }}
                            disabled={isRenaming}
                            autoFocus
                        />
                        {ext && (
                            <span className="shrink-0 rounded-r-md border border-l-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                                {ext}
                            </span>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={renameClicked}
                            disabled={isRenaming || !baseName.trim() || destinationKey === itemKey}
                        >
                            {isRenaming ? "Renaming..." : "Rename"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
