"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import ModeToggle from "@/components/mode-toggle"
import { getPageTitle } from "@/lib/utils"
import { BucketBreadcrumb } from "@/components/bucket-breadcrumb"



export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const isBucketPage = segments[0] === "bucket"
  const bucketName = isBucketPage ? segments[1] : null
  const bucketPath = isBucketPage ? segments.slice(2) : []

  const title = getPageTitle(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="h-4" />

        {/* Title */}
        <h1 className="text-base font-medium capitalize">
          {isBucketPage ? (
            <Link href={`/bucket/${bucketName}`}>{bucketName}</Link>
          ) : title}
        </h1>

        {/* Breadcrumbs */}
        {isBucketPage && bucketName && (
          <BucketBreadcrumb
            bucket={bucketName}
            path={bucketPath}
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
