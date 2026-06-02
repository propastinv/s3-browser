"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

interface Bucket {
    id: string
    provider: string
    bucket: string
    region: string
    endpoint: string
}

export default function BucketsPage() {
    const router = useRouter()
    const [buckets, setBuckets] = useState<Bucket[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchBuckets() {
            try {
                const res = await fetch("/api/buckets")
                const data = await res.json()
                setBuckets(data.items || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchBuckets()
    }, [])

    return (
        <div className="px-4 lg:px-6 py-6 flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Buckets</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {loading
                        ? "Loading..."
                        : buckets.length === 0
                            ? "No buckets configured"
                            : `${buckets.length} bucket${buckets.length > 1 ? "s" : ""} configured`}
                </p>
            </div>

            {loading ? (
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bucket</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Endpoint</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(4)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : buckets.length === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Database />
                        </EmptyMedia>
                        <EmptyTitle>No buckets</EmptyTitle>
                        <EmptyDescription>No buckets have been configured yet.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bucket</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead className="hidden md:table-cell">Endpoint</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {buckets.map((bucket) => (
                                <TableRow
                                    key={bucket.id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/bucket/${encodeURIComponent(bucket.id)}`)}
                                >
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{bucket.bucket}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{bucket.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{bucket.provider}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {bucket.region || "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell max-w-xs truncate">
                                        {bucket.endpoint || "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
