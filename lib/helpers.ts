export function addTimestampToFilename(filename: string) {
    const dotIndex = filename.lastIndexOf(".")

    const now = new Date()

    const stamp =
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + "-" +
        now.getFullYear() + "_" +
        String(now.getHours()).padStart(2, "0") + "-" +
        String(now.getMinutes()).padStart(2, "0") + "-" +
        String(now.getSeconds()).padStart(2, "0")

    if (dotIndex === -1) {
        return `${filename}_${stamp}`
    }

    const namePart = filename.slice(0, dotIndex)
    const extPart = filename.slice(dotIndex)

    return `${namePart}_${stamp}${extPart}`
}

export function normalizeFilename(filename: string, addTimestamp = false) {
    const dotIndex = filename.lastIndexOf(".")

    const namePart =
        dotIndex === -1
            ? filename
            : filename.slice(0, dotIndex)

    const extPart =
        dotIndex === -1
            ? ""
            : filename.slice(dotIndex).toLowerCase()

    const cleanName = namePart
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^\w\-а-яА-ЯёЁіїєІЇЄ]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")

    if (!addTimestamp) {
        return `${cleanName}${extPart}`
    }

    return addTimestampToFilename(`${cleanName}${extPart}`)
}