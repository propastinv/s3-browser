import Link from "next/link"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface BucketBreadcrumbProps {
    bucket: string
    path: string[]
}

export function BucketBreadcrumb({ bucket, path }: BucketBreadcrumbProps) {
    if (!path.length) return null
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {path.map((segment, index) => {
                    const isLast = index === path.length - 1
                    const href =
                        "/bucket/" +
                        [bucket, ...path.slice(0, index + 1)].join("/")

                    return (
                        <div key={index} className="flex items-center gap-1.5 text-sm wrap-break-word sm:gap-2.5">
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>
                                        {segment}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>
                                            {segment}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </div>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
