import { BucketObject } from '@/types/bucket';

export const handleCopyPath = async (
    file: BucketObject | string | undefined, 
    publicUrlPrefix?: string, 
    onSuccess?: () => void,
    onError?: (err: any) => void
) => {
    if (!file) return

    try {
        const key = typeof file === 'string' ? file : file.key
        
        const encodedKey = key
            .split("/")
            .map(part => encodeURIComponent(part))
            .join("/")

        const textToCopy = publicUrlPrefix
            ? `${publicUrlPrefix}${encodedKey}`
            : key

        await navigator.clipboard.writeText(textToCopy)
        onSuccess?.()
    } catch (err) {
        console.error("Failed to copy", err)
        onError?.(err)
    }
}