"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader } from "@/components/ui/Loader";
import { Folder, File } from "lucide-react"
import { FileDrawer } from "@/components/Drawer";
import { formatSize } from "@/lib/formatters";
import { BucketObject } from '@/types/bucket';
import { New } from "@/components/New";
import { Upload } from "@/components/Upload";
import { Refresh } from "@/components/Refresh";
import {
    ButtonGroup
} from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"


export default function BucketPage() {
    const params = useParams()
    const bucketId = params.bucketId as string
    const path = Array.isArray(params.path) ? params.path : []
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

    const filteredItems = items.filter(item => {
        const name = item.key.replace(prefix, "").replace(/\/$/, "")
        return name.toLowerCase().includes(searchQuery.toLowerCase())
    })


    return (
        <div className="px-4 lg:gap-2 lg:px-6 py-6">
            <div className="mb-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                        type="text"
                        name="search"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-2 py-1 border rounded-md focus:outline-none focus:ring flex-1 min-w-0 w-full sm:w-auto"
                    />

                    <div className="flex justify-start sm:justify-normal">
                        <ButtonGroup className="flex w-full sm:w-auto">
                            <New className="flex-1 sm:flex-none" />
                            <Upload className="flex-1 sm:flex-none" refresh={refreshFiles} method={uploadMethod} />
                            <Refresh className="flex-1 sm:flex-none" refresh={refreshFiles} />
                        </ButtonGroup>

                    </div>
                </div>

            </div>

            <div className="relative min-h-40 py-2">
                {loading ? (
                    <Loader />
                ) : (
                    <ul className="space-y-0.5">
                        {filteredItems.map((item) => {
                            const name = item.key.replace(prefix, "").replace(/\/$/, "")
                            const href = item.type === "folder" ? `/bucket/${bucketId}/${[...path, name].join("/")}` : "#"

                            return (
                                <li key={item.key}>
                                    {item.type === "folder" ? (
                                        <Link
                                            href={href}
                                            className="flex items-center justify-between py-1 rounded hover:bg-accent transition-colors"
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="w-5 flex justify-center shrink-0">
                                                    <Folder size={16} className="text-muted-foreground" />
                                                </span>
                                                <span className="truncate">{name}</span>
                                            </span>
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => handleFileClick(item)}
                                            className="flex items-center justify-between w-full py-1 rounded hover:bg-accent transition-colors text-left"
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="w-5 flex justify-center shrink-0">
                                                    <File size={16} className="text-muted-foreground" />
                                                </span>
                                                <span className="truncate">{name}</span>
                                            </span>
                                            {item.size !== undefined && (
                                                <span className="text-sm text-muted-foreground ml-4 shrink-0">{formatSize(item.size)}</span>
                                            )}
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}

                <FileDrawer
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    file={selectedFile}
                    refresh={refreshFiles}
                />
            </div>
        </div>
    )
}
