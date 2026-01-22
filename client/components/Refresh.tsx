"use client"

import { useState } from "react"
import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface RefreshProps {
    refresh: () => Promise<void>;
    className?: string;
}

export function Refresh({ refresh, className }: RefreshProps) {
    const [loading, setLoading] = useState(false)

    const handleRefresh = async () => {
        if (loading) return

        try {
            setLoading(true)
            await refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
                "gap-2",
                className
            )}
        >
            <RefreshCcw
                size={16}
                className={loading ? "animate-spin" : ""}
            />
            Refresh
        </Button>
    )
}
