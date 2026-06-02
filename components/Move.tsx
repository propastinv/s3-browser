"use client"

import { useState, useEffect } from "react";
import { ArrowRightLeft, ChevronRight, Folder, CornerLeftUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"
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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function getFileName(itemKey: string, isFolder: boolean): string {
    if (isFolder) {
        const withoutSlash = itemKey.slice(0, -1);
        return withoutSlash.split('/').pop() || withoutSlash;
    }
    return itemKey.split('/').pop() || itemKey;
}

function getParentPath(itemKey: string, isFolder: boolean): string {
    if (isFolder) {
        const withoutSlash = itemKey.slice(0, -1);
        const i = withoutSlash.lastIndexOf('/');
        return i === -1 ? '' : withoutSlash.slice(0, i + 1);
    }
    const i = itemKey.lastIndexOf('/');
    return i === -1 ? '' : itemKey.slice(0, i + 1);
}

function getPathUp(path: string): string {
    const withoutSlash = path.slice(0, -1);
    const i = withoutSlash.lastIndexOf('/');
    return i === -1 ? '' : withoutSlash.slice(0, i + 1);
}

function getSegments(path: string): { label: string; path: string }[] {
    if (!path) return [];
    return path.slice(0, -1).split('/').map((part, i, arr) => ({
        label: part,
        path: arr.slice(0, i + 1).join('/') + '/',
    }));
}

export function Move({
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

    const [browsePath, setBrowsePath] = useState('');
    const [subfolders, setSubfolders] = useState<string[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    const fileName = getFileName(itemKey, isFolder);
    const destinationKey = browsePath + fileName + (isFolder ? '/' : '');
    const canMove = !isMoving && destinationKey !== itemKey;

    const fetchFolders = async (path: string) => {
        setLoadingFolders(true);
        try {
            const res = await fetch(`/api/bucket/${bucketId}?prefix=${encodeURIComponent(path)}`);
            const data = await res.json();
            const folders = (data.items ?? [])
                .filter((item: any) => item.type === 'folder' && item.key !== itemKey)
                .map((item: any) => item.key as string);
            setSubfolders(folders);
        } catch {
            toast.error("Failed to load folders");
        } finally {
            setLoadingFolders(false);
        }
    };

    const navigateTo = (path: string) => {
        setBrowsePath(path);
        fetchFolders(path);
    };

    const openDialog = () => {
        const startPath = getParentPath(itemKey, isFolder);
        setBrowsePath(startPath);
        setIsOpen(true);
        fetchFolders(startPath);
    };

    useEffect(() => {
        if (isControlled && isOpen) {
            const startPath = getParentPath(itemKey, isFolder);
            setBrowsePath(startPath);
            fetchFolders(startPath);
        }
    }, [isControlled, isOpen]);

    const moveClicked = async () => {
        if (destinationKey === itemKey) {
            toast.error("Source and destination must be different");
            return;
        }
        setIsMoving(true);
        const toastId = toast.loading(`Preparing to move ${fileName}...`);
        try {
            const res = await fetch(`/api/bucket/${bucketId}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceKey: itemKey, destinationKey }),
            });
            const data = await res.json();

            if (res.ok && data.jobId) {
                setIsOpen(false);
                const poll = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`/api/bucket/${bucketId}/move/status?jobId=${data.jobId}`);
                        if (!statusRes.ok) return;
                        const job = await statusRes.json();
                        if (job.status === 'completed') {
                            clearInterval(poll);
                            toast.success(`Moved ${fileName} successfully`, { id: toastId, description: '100% completed' });
                            refresh();
                            setIsMoving(false);
                        } else if (job.status === 'error') {
                            clearInterval(poll);
                            toast.error(`Failed to move: ${job.error}`, { id: toastId });
                            setIsMoving(false);
                        } else {
                            toast.loading(`Moving ${fileName}...`, {
                                id: toastId,
                                classNames: { description: 'w-full', content: 'w-full flex-1', toast: 'w-full' },
                                description: (
                                    <div className="flex flex-col gap-2 mt-2 w-full">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{job.processedItems} / {job.totalItems} copied</span>
                                            <span>{job.progress}%</span>
                                        </div>
                                        <Progress value={job.progress} className="h-1.5 w-full" />
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {job.progress > 50 ? 'Deleting old files...' : 'Copying to new location...'}
                                        </div>
                                    </div>
                                ),
                            });
                        }
                    } catch { /* ignore */ }
                }, 1000);
            } else {
                toast.error(data.error || "Failed to start move", { id: toastId });
                setIsMoving(false);
            }
        } catch {
            toast.error("An error occurred during move", { id: toastId });
            setIsMoving(false);
        }
    };

    const segments = getSegments(browsePath);

    return (
        <>
            {!isControlled && (label ? (
                <Button variant="outline" className={`gap-2 ${className || ''}`} onClick={openDialog}>
                    <ArrowRightLeft className="size-4" />
                    {label}
                </Button>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className || ''}`} onClick={openDialog}>
                            <ArrowRightLeft className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move</TooltipContent>
                </Tooltip>
            ))}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move</DialogTitle>
                        <DialogDescription>
                            Select destination for <b>{fileName}</b>.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Breadcrumb */}
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                {segments.length === 0 ? (
                                    <BreadcrumbPage>Root</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <button onClick={() => navigateTo('')}>Root</button>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {segments.map((seg, i) => (
                                <>
                                    <BreadcrumbSeparator key={`sep-${seg.path}`} />
                                    <BreadcrumbItem key={seg.path}>
                                        {i === segments.length - 1 ? (
                                            <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <button onClick={() => navigateTo(seg.path)}>{seg.label}</button>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Folder list */}
                    <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                        {browsePath && (
                            <button
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                onClick={() => navigateTo(getPathUp(browsePath))}
                            >
                                <CornerLeftUp className="size-4 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">..</span>
                            </button>
                        )}
                        {loadingFolders ? (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Loading...</div>
                        ) : subfolders.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No subfolders</div>
                        ) : (
                            subfolders.map(f => {
                                const name = f.slice(browsePath.length).replace(/\/$/, '');
                                return (
                                    <button
                                        key={f}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                        onClick={() => navigateTo(f)}
                                    >
                                        <Folder className="size-4 text-amber-300 shrink-0" fill="currentColor" />
                                        <span className="flex-1 text-left truncate">{name}</span>
                                        <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Destination: <span className="font-mono">{browsePath || '/'}</span>
                    </p>

                    <DialogFooter>
                        <Button onClick={moveClicked} disabled={!canMove}>
                            {isMoving ? "Moving..." : "Move here"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
