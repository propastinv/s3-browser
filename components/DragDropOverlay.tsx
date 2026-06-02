"use client"

import { useEffect, useRef, useState } from "react"
import { UploadCloud } from "lucide-react"

export function DragDropOverlay({ onDrop }: { onDrop: (files: File[]) => void }) {
    const [isOver, setIsOver] = useState(false)
    const counterRef = useRef(0)

    useEffect(() => {
        const onDragEnter = (e: DragEvent) => {
            if (!e.dataTransfer?.types.includes("Files")) return
            counterRef.current++
            setIsOver(true)
        }

        const onDragLeave = () => {
            counterRef.current--
            if (counterRef.current <= 0) {
                counterRef.current = 0
                setIsOver(false)
            }
        }

        const onDragOver = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes("Files")) e.preventDefault()
        }

        const onDropDoc = (e: DragEvent) => {
            e.preventDefault()
            counterRef.current = 0
            setIsOver(false)
            const files = Array.from(e.dataTransfer?.files ?? [])
            if (files.length) onDrop(files)
        }

        document.addEventListener("dragenter", onDragEnter)
        document.addEventListener("dragleave", onDragLeave)
        document.addEventListener("dragover", onDragOver)
        document.addEventListener("drop", onDropDoc)

        return () => {
            document.removeEventListener("dragenter", onDragEnter)
            document.removeEventListener("dragleave", onDragLeave)
            document.removeEventListener("dragover", onDragOver)
            document.removeEventListener("drop", onDropDoc)
        }
    }, [onDrop])

    if (!isOver) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/10 supports-backdrop-filter:backdrop-blur-xs">
            <div className="flex flex-col items-center gap-4 px-12 py-10 rounded-2xl border-2 border-dashed border-primary/40 bg-background/80 backdrop-blur-sm shadow-lg">
                <UploadCloud className="size-14 text-primary animate-bounce" strokeWidth={1.5} />
                <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-xl font-semibold text-foreground">Drop files here</span>
                    <span className="text-sm text-muted-foreground">Release to upload</span>
                </div>
            </div>
        </div>
    )
}
