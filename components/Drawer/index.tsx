"use client"

import { DrawerProps } from "./Drawer.types"
import { formatSize, formatDate } from "@/lib/formatters"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose,
    DrawerDescription
} from "@/components/ui/drawer"
import { ClipboardCopy } from 'lucide-react';
import { Button } from "@/components/ui/button"

export function FileDrawer({ isOpen, onClose, file, refresh }: DrawerProps) {
    const pathname = usePathname()
    const parts = pathname.split("/").filter(Boolean)

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    const isImage = imageExtensions.some(ext =>
        file?.key.toLowerCase().endsWith(ext)
    )

    let bucketId = ""
    if (parts[0] === "bucket") {
        bucketId = parts[1]
    }

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!file || !isImage) {
            setThumbnailUrl(null)
            setLoading(false)
            return
        }

        setLoading(true)
        const url = `/api/bucket/${bucketId}/thumbnail?key=${encodeURIComponent(
            file.key
        )}`

        const img = new Image()
        img.src = url
        img.onload = () => {
            setThumbnailUrl(url)
            setLoading(false)
        }
        img.onerror = () => {
            setThumbnailUrl(null)
            setLoading(false)
        }
    }, [file, bucketId, isImage])

    const handleDelete = async () => {
        if (!file) return

        const confirmed = window.confirm(
            `Are you sure you want to delete "${file.key}"?`
        )
        if (!confirmed) return

        try {
            const res = await fetch(`/api/bucket/${bucketId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileKey: file.key }),
            })

            const data = await res.json()

            if (!res.ok) {
                alert(`Error deleting file: ${data.error}`)
            } else {
                onClose()
                await refresh()
            }
        } catch (err) {
            console.error(err)
            alert("Failed to delete file")
        }
    }

    const handleDownload = () => {
        if (!file) return

        const url = `/api/bucket/${bucketId}/download?key=${encodeURIComponent(
            file.key
        )}`

        window.open(url, "_blank")
    }

    const handleCopyPath = async () => {
        if (!file) return

        try {
            await navigator.clipboard.writeText(file.key)
            setCopied(true)

            setTimeout(() => setCopied(false), 1500)
        } catch (err) {
            console.error("Failed to copy", err)
        }
    }




    return (
        <Drawer
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
            direction="right"
        >
            <DrawerContent className="h-full w-[24rem] ml-auto">
                <DrawerHeader>
                    <DrawerTitle className="truncate">
                        File
                    </DrawerTitle>
                    <DrawerDescription>
                        <span className="flex items-center justify-between gap-2">
                            <span className="truncate pr-2">
                                {file?.key}
                            </span>

                            <TooltipProvider>
                                <Tooltip open={copied ? true : undefined}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyPath}
                                            title="Copy path"
                                            className="h-7 w-7 p-0 shrink-0"
                                        >
                                            <ClipboardCopy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>

                                    <TooltipContent side="left">
                                        {copied ? "Copied!" : "Copy path"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </span>
                    </DrawerDescription>


                </DrawerHeader>

                <div className="flex flex-col gap-4 px-4 overflow-y-auto">
                    {isImage && (
                        <div className="flex justify-center items-center min-h-32">
                            {loading ? (
                                <div className="text-muted-foreground">Loading...</div>
                            ) : thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt={file?.key}
                                    className="w-full max-h-64 object-contain rounded"
                                />
                            ) : (
                                <div className="text-muted-foreground">
                                    Failed to load image
                                </div>
                            )}
                        </div>
                    )}

                    <table className="text-sm">
                        <tbody>
                            <tr>
                                <td className="pr-4 font-medium text-muted-foreground">
                                    Type
                                </td>
                                <td>{file?.type}</td>
                            </tr>
                            {file?.size !== undefined && (
                                <tr>
                                    <td className="pr-4 font-medium text-muted-foreground">
                                        Size
                                    </td>
                                    <td>{formatSize(file.size)}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="pr-4 font-medium text-muted-foreground">
                                    Last modified
                                </td>
                                <td>{file?.lastModified ? formatDate(file.lastModified) : "Unknown"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <DrawerFooter className="mt-auto">
                    <Button onClick={handleDownload}>
                        Download
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                    {/* <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                    </DrawerClose> */}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
