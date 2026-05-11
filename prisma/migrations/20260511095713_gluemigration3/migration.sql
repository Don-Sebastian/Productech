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

-- CreateIndex
CREATE INDEX "GlueStockLog_glueStockId_idx" ON "GlueStockLog"("glueStockId");

-- AddForeignKey
ALTER TABLE "GlueStockLog" ADD CONSTRAINT "GlueStockLog_glueStockId_fkey" FOREIGN KEY ("glueStockId") REFERENCES "GlueStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
