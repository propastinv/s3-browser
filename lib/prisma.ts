import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient | null {
    if (!process.env.DATABASE_URL) return null;

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });

    return new PrismaClient({ adapter });
}

export const prisma: PrismaClient | null =
    globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
    globalForPrisma.prisma = prisma;
}
