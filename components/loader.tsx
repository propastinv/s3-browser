"use client"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

interface LoaderProps {
    className?: string
    size?: "sm" | "md" | "lg"
    text?: string
}

export function Loader({ className, size = "md", text }: LoaderProps) {
    const sizeClasses = {
        sm: "size-4",
        md: "size-8",
        lg: "size-12",
    }

    return (
        <div
            className={cn(
                "flex h-full w-full flex-1 flex-col items-center justify-center gap-3",
                className
            )}
        >
            <Spinner className={cn(sizeClasses[size], "text-muted-foreground")} />
            {text && (
                <p className="text-sm text-muted-foreground">{text}</p>
            )}
        </div>
    )
}
