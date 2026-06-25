function splitFilenameAndExt(filename: string): [string, string] {
    const compoundMatch = filename.match(/^(.+?)(\.tar\.[a-z0-9]+)$/i)
    if (compoundMatch) {
        return [compoundMatch[1], compoundMatch[2].toLowerCase()]
    }
    const dotIndex = filename.lastIndexOf(".")
    if (dotIndex === -1) return [filename, ""]
    return [filename.slice(0, dotIndex), filename.slice(dotIndex).toLowerCase()]
}

export function addTimestampToFilename(filename: string) {
    const [namePart, extPart] = splitFilenameAndExt(filename)

    const now = new Date()

    const stamp =
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0") + "-" +
        now.getFullYear() + "_" +
        String(now.getHours()).padStart(2, "0") + "-" +
        String(now.getMinutes()).padStart(2, "0") + "-" +
        String(now.getSeconds()).padStart(2, "0")

    if (!extPart) {
        return `${namePart}_${stamp}`
    }

    return `${namePart}_${stamp}${extPart}`
}

export function normalizeFilename(filename: string, addTimestamp = false) {
    const [namePart, extPart] = splitFilenameAndExt(filename)

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