"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Folder, File, Search, FolderOpen, Trash2, SortAsc, SortDesc, Clock, HardDrive, Type, Copy, Check } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Loader } from "@/components/loader"
import { FileDrawer } from "@/components/Drawer"
import { formatSize } from "@/lib/formatters"
import { BucketObject } from "@/types/bucket"
import { New } from "@/components/New"
import { BulkMove } from "@/components/BulkMove"
import { ItemActions } from "@/components/ItemActions"
import { Upload } from "@/components/Upload"
import { DragDropOverlay } from "@/components/DragDropOverlay"
import { Refresh } from "@/components/Refresh"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { handleCopyPath } from "@/lib/copy"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const isImage = (key: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(key)


export default function BucketPage() {
    const params = useParams()
    const router = useRouter()
    const bucketId = params.bucketId as string
    const path = Array.isArray(params.path) ? params.path.map(decodeURIComponent) : []
    const prefix = path.length ? path.join("/") + "/" : ""

    const [items, setItems] = useState<BucketObject[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [uploadMethod, setUploadMethod] = useState<"proxy" | "direct">("proxy")
    const [publicUrlPrefix, setPublicUrlPrefix] = useState<string | undefined>(undefined)
    const [addTimestamp, setAddTimestamp] = useState<boolean>(false)
    const [selectedFile, setSelectedFile] = useState<BucketObject | undefined>(undefined)
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [keysToDelete, setKeysToDelete] = useState<string[]>([])
    const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name")
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
    const [droppedFiles, setDroppedFiles] = useState<File[]>([])
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    const copyWithFeedback = (item: BucketObject) => {
        handleCopyPath(item, publicUrlPrefix, () => {
            toast.success("Copied")
            setCopiedKey(item.key)
            setTimeout(() => setCopiedKey(null), 2000)
        }, () => toast.error("Failed to copy"))
    }


    async function refreshFiles() {
        setLoading(true)
        setSelectedKeys(new Set())
        const res = await fetch(`/api/bucket/${bucketId}?prefix=${encodeURIComponent(prefix)}`)
        const data = await res.json()
        setItems(data.items || [])
        setUploadMethod(data.uploadMethod || "proxy")
        setPublicUrlPrefix(data.publicUrlPrefix)
        setAddTimestamp(data.addTimestamp || false)
        setLoading(false)
    }

    useEffect(() => {
        refreshFiles()
    }, [bucketId, prefix])

    function handleFileClick(file: BucketObject) {
        setSelectedFile(file)
        setIsOpen(true)
    }

    const sortedItems = [...items].sort((a, b) => {
        // Always folders first
        if (a.type === "folder" && b.type !== "folder") return -1
        if (a.type !== "folder" && b.type === "folder") return 1

        if (sortBy === "name") {
            const nameA = a.key.toLowerCase()
            const nameB = b.key.toLowerCase()
            return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        }

        if (sortBy === "date") {
            const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0
            const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0
            if (dateA === dateB) {
                return a.key.localeCompare(b.key)
            }
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA
        }

        if (sortBy === "size") {
            const sizeA = a.size || 0
            const sizeB = b.size || 0
            if (sizeA === sizeB) {
                return a.key.localeCompare(b.key)
            }
            return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA
        }

        return 0
    })

    const filteredItems = sortedItems.filter((item) => {
        const name = item.key.replace(prefix, "").replace(/\/$/, "")
        return name.toLowerCase().includes(searchQuery.toLowerCase())
    })

    const folders = filteredItems.filter((item) => item.type === "folder")
    const files = filteredItems.filter((item) => item.type !== "folder")


    const toggleSelect = (key: string) => {
        const newSelected = new Set(selectedKeys)
        if (newSelected.has(key)) {
            newSelected.delete(key)
        } else {
            newSelected.add(key)
        }
        setSelectedKeys(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedKeys.size === filteredItems.length && filteredItems.length > 0) {
            setSelectedKeys(new Set())
        } else {
            setSelectedKeys(new Set(filteredItems.map(i => i.key)))
        }
    }

    const handleBulkDelete = (keys?: string[]) => {
        const targetKeys = keys || Array.from(selectedKeys)
        if (targetKeys.length === 0) return
        setKeysToDelete(targetKeys)
        setConfirmOpen(true)
    }

    const performDelete = async () => {
        if (keysToDelete.length === 0) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/bucket/${bucketId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileKeys: keysToDelete })
            })
            if (res.ok) {
                toast.success(`${keysToDelete.length} ${keysToDelete.length === 1 ? 'item' : 'items'} deleted`)
                setConfirmOpen(false)
                refreshFiles()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to delete items')
            }
        } catch (err) {
            toast.error('An error occurred during deletion')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <InputGroup className="w-full sm:flex-1">
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

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <ButtonGroup className="flex-1 sm:flex-initial">
                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                <SelectTrigger className="flex-1 sm:w-32.5" >
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">
                                        <Type className="mr-2 size-4" />
                                        Name
                                    </SelectItem>
                                    <SelectItem value="date">
                                        <Clock className="mr-2 size-4" />
                                        Date
                                    </SelectItem>
                                    <SelectItem value="size">
                                        <HardDrive className="mr-2 size-4" />
                                        Size
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="px-2 shrink-0"
                                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                        >
                                            {sortOrder === "asc" ? (
                                                <SortAsc className="size-4" />
                                            ) : (
                                                <SortDesc className="size-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {sortOrder === "asc" ? "Sort Ascending" : "Sort Descending"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </ButtonGroup>

                        <ButtonGroup className="flex-1 sm:flex-initial">

                            {selectedKeys.size > 0 ? (
                                <>
                                    <BulkMove
                                        bucketId={bucketId}
                                        selectedKeys={Array.from(selectedKeys)}
                                        refresh={() => {
                                            setSelectedKeys(new Set());
                                            refreshFiles();
                                        }}
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleBulkDelete()}
                                        disabled={isDeleting}
                                        className="gap-2 flex-1 sm:flex-initial"
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="hidden sm:inline">Delete {selectedKeys.size} {selectedKeys.size === 1 ? 'item' : 'items'}</span>
                                        <span className="sm:hidden">{selectedKeys.size}</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedKeys(new Set())}
                                        disabled={isDeleting}
                                        className="shrink-0"
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <New className="bg-blue-600 text-white hover:bg-blue-700 flex-1 sm:flex-initial" />
                                    <Upload refresh={refreshFiles} addTimestamp={addTimestamp} className="bg-green-600 text-white hover:bg-green-700 flex-1 sm:flex-initial" method={uploadMethod} externalFiles={droppedFiles} onExternalFilesConsumed={() => setDroppedFiles([])} />
                                    <Refresh refresh={refreshFiles} className="shrink-0" />
                                </>
                            )}
                        </ButtonGroup>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-3">
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
                                    <Upload refresh={refreshFiles} addTimestamp={addTimestamp} className="bg-green-600 text-white hover:bg-green-700" method={uploadMethod} />
                                </ButtonGroup>
                            </EmptyContent>
                        )}
                    </Empty>
                ) : (
                    <div className="rounded-md border overflow-hidden">
                        <TooltipProvider>
                            <Table>
                                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-10 px-3">
                                            <Checkbox
                                                checked={selectedKeys.size === filteredItems.length && filteredItems.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="px-2">
                                            {selectedKeys.size > 0 ? `${selectedKeys.size} selected` : 'Name'}
                                        </TableHead>
                                        <TableHead className="hidden sm:table-cell text-center w-36 px-2">Date</TableHead>
                                        <TableHead className="text-center w-24 px-2">Size</TableHead>
                                        <TableHead className="w-10 px-2" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {folders.map((item) => {
                                        const name = item.key.replace(prefix, "").replace(/\/$/, "")
                                        const href = `/bucket/${bucketId}/${[...path, name].join("/")}`
                                        const isSelected = selectedKeys.has(item.key)
                                        return (
                                            <TableRow
                                                key={item.key}
                                                onClick={() => router.push(href)}
                                                className={`group cursor-pointer select-none ${isSelected ? 'bg-primary/5 hover:bg-primary/5' : ''}`}
                                            >
                                                <TableCell className="px-3 py-2 w-10" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(item.key)} />
                                                </TableCell>
                                                <TableCell className="px-2 py-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Folder className="size-5 shrink-0 text-amber-300" fill="currentColor" />
                                                        <span className="truncate">{name}</span>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 shrink-0 ml-auto opacity-0 group-hover:opacity-100"
                                                                    onClick={(e) => { e.stopPropagation(); copyWithFeedback(item) }}
                                                                >
                                                                    <span key={copiedKey === item.key ? 'check' : 'copy'} className="animate-in zoom-in-75 fade-in duration-150">
                                                                        {copiedKey === item.key
                                                                            ? <Check className="size-3.5 text-green-500" />
                                                                            : <Copy className="size-3.5" />}
                                                                    </span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy {publicUrlPrefix ? "URL" : "path"}</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell text-right text-muted-foreground px-2 py-2 w-36">
                                                    {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : '—'}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground px-2 py-2 w-24">—</TableCell>
                                                <TableCell className="px-2 py-2 w-10 text-right">
                                                    <ItemActions
                                                        bucketId={bucketId}
                                                        item={item}
                                                        isFolder={true}
                                                        refresh={refreshFiles}
                                                        onDelete={(key) => handleBulkDelete([key])}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}

                                    {files.map((item) => {
                                        const name = item.key.replace(prefix, "").replace(/\/$/, "")
                                        const isSelected = selectedKeys.has(item.key)
                                        return (
                                            <TableRow
                                                key={item.key}
                                                onClick={() => handleFileClick(item)}
                                                className={`group cursor-pointer select-none ${isSelected ? 'bg-primary/5 hover:bg-primary/5' : ''}`}
                                            >
                                                <TableCell className="px-3 py-2 w-10" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(item.key)} />
                                                </TableCell>
                                                <TableCell className="px-2 py-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {isImage(item.key) ? (
                                                            <div className="size-7 shrink-0 overflow-hidden rounded border bg-muted/50">
                                                                <img
                                                                    src={`/api/bucket/${bucketId}/thumbnail?key=${encodeURIComponent(item.key)}`}
                                                                    alt={name}
                                                                    loading="lazy"
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <File className="size-5 shrink-0 text-blue-500" />
                                                        )}
                                                        <span className="truncate">{name}</span>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 shrink-0 ml-auto opacity-0 group-hover:opacity-100"
                                                                    onClick={(e) => { e.stopPropagation(); copyWithFeedback(item) }}
                                                                >
                                                                    <span key={copiedKey === item.key ? 'check' : 'copy'} className="animate-in zoom-in-75 fade-in duration-150">
                                                                        {copiedKey === item.key
                                                                            ? <Check className="size-3.5 text-green-500" />
                                                                            : <Copy className="size-3.5" />}
                                                                    </span>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy {publicUrlPrefix ? "URL" : "path"}</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell text-right text-muted-foreground px-2 py-2 w-36">
                                                    {item.lastModified ? new Date(item.lastModified).toLocaleString() : '—'}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground px-2 py-2 w-24">
                                                    {item.size !== undefined ? formatSize(item.size) : '—'}
                                                </TableCell>
                                                <TableCell className="px-2 py-2 w-10 text-right">
                                                    <ItemActions
                                                        bucketId={bucketId}
                                                        item={item}
                                                        isFolder={false}
                                                        refresh={refreshFiles}
                                                        onDelete={(key) => handleBulkDelete([key])}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TooltipProvider>
                    </div>
                )}
            </div>

            <FileDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                file={selectedFile}
                refresh={refreshFiles}
                publicUrlPrefix={publicUrlPrefix}
            />

            <DragDropOverlay onDrop={setDroppedFiles} />

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={performDelete}
                title={keysToDelete.length === 1
                    ? `Delete "${keysToDelete[0].replace(prefix, "")}"`
                    : `Delete ${keysToDelete.length} items`}
                description="This action cannot be undone."
                loading={isDeleting}
            />
        </div>
    )
}
