import { prisma } from "@/lib/prisma"
import { RecentActionsTable } from "@/components/recent-actions-table"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/next-auth-options"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function RecentPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/api/auth/signin")
    }

    const userGroups = session.user.groups ?? []

    const actions = await prisma.s3FileActionLog.findMany({
        where: {
            group: {
                in: userGroups,
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 50,
    })

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Recent Actions</h2>
                    <p className="text-muted-foreground">
                        Latest file activities across buckets.
                    </p>
                </div>
            </div>
            <div className="grid gap-4">
                <RecentActionsTable actions={actions} />
            </div>
        </div>
    )
}
