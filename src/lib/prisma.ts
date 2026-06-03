import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Connection pool tuning:
// - connection_limit=10: prevents saturating PostgreSQL max_connections (default 100) across serverless workers
// - pool_timeout=10: fast failure on connection contention instead of hanging
const dbUrl = process.env.DATABASE_URL || "";
const pooledUrl = dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connection_limit=10&pool_timeout=10";

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
    datasourceUrl: pooledUrl,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
