"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { IconArrowUpRight, IconTrash, IconClock } from "@tabler/icons-react"

interface ActionLog {
    id: number
    action: string
    bucket: string
    key: string
    group: string
    userName?: string | null
    createdAt: Date
}

interface RecentActionsTableProps {
    actions: ActionLog[]
}

export function RecentActionsTable({ actions }: RecentActionsTableProps) {
    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date))
    }

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'UPLOAD':
                return (
                    <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <IconArrowUpRight size={14} />
                        Upload
                    </Badge>
                )
            case 'DELETE':
                return (
                    <Badge variant="outline" className="gap-1 border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <IconTrash size={14} />
                        Delete
                    </Badge>
                )
            default:
                return <Badge variant="secondary">{action}</Badge>
        }
    }

    if (actions.length === 0) {
        return (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
                <IconClock size={48} className="mb-4 opacity-20" />
                <p>No recent actions found</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[120px]">Action</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead className="hidden lg:table-cell">Bucket</TableHead>
                        <TableHead className="hidden md:table-cell">User</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {actions.map((action) => (
                        <TableRow key={action.id}>
                            <TableCell>{getActionBadge(action.action)}</TableCell>
                            <TableCell className="font-medium max-w-[200px] sm:max-w-[300px] truncate">
                                {action.key}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                                {action.bucket}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {action.userName || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right text-sm text-zinc-400">
                                {formatTime(action.createdAt)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
