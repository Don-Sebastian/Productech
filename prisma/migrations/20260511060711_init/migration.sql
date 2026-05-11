-- CreateTable
CREATE TABLE "GlueStock" (
    "id" TEXT NOT NULL,
    "currentKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "GlueStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlueStockLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "balanceKg" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "glueStockId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "GlueStockLog_pkey" PRIMARY KEY ("id")
);