"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Bucket {
    id: string
    provider: string
    bucket: string
    region: string
    endpoint: string
}

export default function BucketsPage() {
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
        <div className="">
            <div className="px-4 lg:gap-2 lg:px-6 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        Buckets
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        {buckets.length === 0
                            ? "No buckets configured yet"
                            : `${buckets.length} bucket${buckets.length > 1 ? "s" : ""}`}
                    </p>
                </div>

                {loading ? (
                    <div className="max-w-7xl mx-auto space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                            />
                        ))}
                    </div>
                ) : buckets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
                        <p className="text-slate-600 dark:text-slate-400">
                            No buckets found
                        </p>
                    </div>
                ) : (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <div className="col-span-4">Bucket</div>
                            <div className="col-span-2">Provider</div>
                            <div className="col-span-3">Region</div>
                            <div className="col-span-3">Endpoint</div>
                        </div>

                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {buckets.map((bucket) => (
                                <Link
                                    key={bucket.id}
                                    href={`/bucket/${bucket.id}`}
                                    className="block hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                >
                                    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                                        <div className="col-span-4 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-slate-50 truncate">
                                                {bucket.bucket}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono truncate">
                                                {bucket.id}
                                            </p>
                                        </div>

                                        <div className="col-span-2">
                                            <span className="inline-flex rounded-md bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                                {bucket.provider}
                                            </span>
                                        </div>

                                        <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 truncate">
                                            {bucket.region}
                                        </div>

                                        <div className="col-span-3 text-sm text-slate-600 dark:text-slate-400 truncate">
                                            {bucket.endpoint}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
