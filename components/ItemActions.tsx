"use client"

import { useState } from "react"
import { MoreHorizontal, ArrowRightLeft, Pencil, Trash2 } from "lucide-react"
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

export function ItemActions({
    bucketId,
    item,
    isFolder,
    refresh,
    onDelete,
}: {
    bucketId: string
    item: BucketObject
    isFolder: boolean
    refresh: () => void
    onDelete: (key: string) => void
}) {
    const [moveOpen, setMoveOpen] = useState(false)
    const [renameOpen, setRenameOpen] = useState(false)

    return (
        <div onClick={(e) => e.stopPropagation()}>
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
        </div>
    )
}
