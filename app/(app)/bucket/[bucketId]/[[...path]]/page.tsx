"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Folder, File, Search, FolderOpen, ChevronRight } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Loader } from "@/components/loader"
import { FileDrawer } from "@/components/Drawer"
import { formatSize } from "@/lib/formatters"
import { BucketObject } from "@/types/bucket"
import { New } from "@/components/New"
import { Upload } from "@/components/Upload"
import { Refresh } from "@/components/Refresh"

export default function BucketPage() {
    const params = useParams()
    const bucketId = params.bucketId as string
    const path = Array.isArray(params.path) ? params.path.map(decodeURIComponent) : []
    const prefix = path.length ? path.join("/") + "/" : ""

    const [items, setItems] = useState<BucketObject[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [uploadMethod, setUploadMethod] = useState<"proxy" | "direct">("proxy")
    const [selectedFile, setSelectedFile] = useState<BucketObject | undefined>(undefined)

    async function refreshFiles() {
        setLoading(true)
        const res = await fetch(`/api/bucket/${bucketId}?prefix=${encodeURIComponent(prefix)}`)
        const data = await res.json()
        setItems(data.items || [])
        setUploadMethod(data.uploadMethod || "proxy")
        setLoading(false)
    }

    useEffect(() => {
        refreshFiles()
    }, [bucketId, prefix])

    function handleFileClick(file: BucketObject) {
        setSelectedFile(file)
        setIsOpen(true)
    }

    const filteredItems = items.filter((item) => {
        const name = item.key.replace(prefix, "").replace(/\/$/, "")
        return name.toLowerCase().includes(searchQuery.toLowerCase())
    })

    const folders = filteredItems.filter((item) => item.type === "folder")
    const files = filteredItems.filter((item) => item.type !== "folder")

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background px-4 py-3">
                <div className="flex items-center gap-3">
                    <InputGroup className="flex-1">
                        <InputGroupAddon align="inline-start">
                            <Search className="text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupInput
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </InputGroup>

                    <ButtonGroup className="shrink-0">
                        <New className="bg-blue-600 text-white hover:bg-blue-700" />
                        <Upload refresh={refreshFiles} className="bg-green-600 text-white hover:bg-green-700" method={uploadMethod} />
                        <Refresh refresh={refreshFiles} />
                    </ButtonGroup>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <Loader />
                ) : filteredItems.length === 0 ? (
                    <Empty className="border">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FolderOpen />
                            </EmptyMedia>
                            <EmptyTitle>
                                {searchQuery ? "Nothing found" : "Directory empty"}
                            </EmptyTitle>
                            <EmptyDescription>
                                {searchQuery
                                    ? `No files found for query "${searchQuery}"`
                                    : "Upload files or create a new folder"}
                            </EmptyDescription>
                        </EmptyHeader>
                        {!searchQuery && (
                            <EmptyContent>
                                <ButtonGroup>
                                    <New className="bg-blue-600 text-white hover:bg-blue-700" />
                                    <Upload refresh={refreshFiles} className="bg-green-600 text-white hover:bg-green-700" method={uploadMethod} />
                                </ButtonGroup>
                            </EmptyContent>
                        )}
                    </Empty>
                ) : (
                    <div className="divide-y divide-border rounded-lg border">
                        {/* Folders first */}
                        {folders.map((item) => {
                            const name = item.key.replace(prefix, "").replace(/\/$/, "")
                            const href = `/bucket/${bucketId}/${[...path, name].join("/")}`

                            return (
                                <Link
                                    key={item.key}
                                    href={href}
                                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <Folder className="size-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{name}</p>
                                        <p className="text-sm text-muted-foreground">Directory</p>
                                    </div>
                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                </Link>
                            )
                        })}

                        {/* Files */}
                        {files.map((item) => {
                            const name = item.key.replace(prefix, "").replace(/\/$/, "")

                            return (
                                <button
                                    key={item.key}
                                    onClick={() => handleFileClick(item)}
                                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <File className="size-5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            {item.size !== undefined && (
                                                <span>{formatSize(item.size)}</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <FileDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                file={selectedFile}
                refresh={refreshFiles}
            />
        </div>
    )
}
