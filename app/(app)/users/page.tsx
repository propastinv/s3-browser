import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/next-auth-options"
import { redirect } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/api/auth/signin")
    }

    // Only admins should see this page
    const isAdmin = session.user.groups?.includes("superadmin")
    if (!isAdmin) {
        return (
            <div className="flex-1 p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-red-500">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        )
    }

    const users = await prisma.user.findMany({
        orderBy: {
            createdAt: "desc",
        },
    })

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground">
                        Manage local application users.
                    </p>
                </div>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell className="">{user.role}</TableCell>
                                <TableCell>
                                    {new Date(user.createdAt).toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-4">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
