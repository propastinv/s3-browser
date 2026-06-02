"use client"

import { useState } from "react"
import { MoreHorizontal, ArrowRightLeft, Pencil, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Move } from "@/components/Move"
import { Rename } from "@/components/Rename"
import { BucketObject } from "@/types/bucket"
import { handleCopyPath } from "@/lib/copy"
import { toast } from "sonner"

export function ItemActions({
    bucketId,
    item,
    isFolder,
    refresh,
    publicUrlPrefix,
    onDelete,
}: {
    bucketId: string
    item: BucketObject
    isFolder: boolean
    refresh: () => void
    publicUrlPrefix?: string
    onDelete: (key: string) => void
}) {
    const [moveOpen, setMoveOpen] = useState(false)
    const [renameOpen, setRenameOpen] = useState(false)

    const onCopyPath = () => handleCopyPath(
        item,
        publicUrlPrefix,
        () => toast.success("Path copied to clipboard"),
        () => toast.error("Failed to copy path"),
    )

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                        <ArrowRightLeft className="size-4" />
                        Move
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                        <Pencil className="size-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCopyPath}>
                        <Copy className="size-4" />
                        Copy {publicUrlPrefix ? "URL" : "path"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(item.key)}
                    >
                        <Trash2 className="size-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Move
                bucketId={bucketId}
                itemKey={item.key}
                isFolder={isFolder}
                refresh={refresh}
                open={moveOpen}
                onOpenChange={setMoveOpen}
            />
            <Rename
                bucketId={bucketId}
                itemKey={item.key}
                isFolder={isFolder}
                refresh={refresh}
                open={renameOpen}
                onOpenChange={setRenameOpen}
            />
        </>
    )
}
