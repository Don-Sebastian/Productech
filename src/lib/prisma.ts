import { PrismaClient } from "@prisma/client";

// Cache-busting comment to force Prisma client re-initialization after schema changes: 1775651281
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ log: ["warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
