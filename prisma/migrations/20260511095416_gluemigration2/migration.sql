/*
  Warnings:

  - You are about to drop the `GlueStockLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GlueStockLog" DROP CONSTRAINT "GlueStockLog_glueStockId_fkey";

-- DropTable
DROP TABLE "GlueStockLog";
