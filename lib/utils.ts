import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPageTitle(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)

  if (!segments.length) return "Main"

  if (segments[0] === "bucket" && segments[1]) {
    return segments[1]
  }

  return segments.at(-1)!
}