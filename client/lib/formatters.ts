export function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d)
}