"use client"

import { DrawerProps } from "./Drawer.types"
import { formatSize, formatDate } from "@/lib/formatters"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer"
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
                        {file?.key}
                    </DrawerTitle>
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
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
