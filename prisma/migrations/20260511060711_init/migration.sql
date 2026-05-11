-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'SUBMITTED', 'SUPERVISOR_APPROVED', 'MANAGER_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HotPressStatus" AS ENUM ('RUNNING', 'PAUSED', 'MAINTENANCE', 'STOPPED');

-- CreateEnum
CREATE TYPE "PressEntryType" AS ENUM ('COOK', 'REPRESS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED', 'SENT_TO_SUPERVISOR', 'TO_PRODUCTION_GENERATED', 'PRODUCTION_COMPLETED', 'READY_FOR_DISPATCH', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('SUPERVISOR_SUBMITTED', 'MANAGER_CONFIRMED', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'PEELING', 'DRYING', 'PRESSING', 'FINISHING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'QUALITY_CHECK', 'FAILED');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'DAMAGE');

-- CreateEnum
CREATE TYPE "MachineAction" AS ENUM ('START', 'STOP', 'PAUSE', 'RESUME', 'MAINTENANCE', 'BREAKDOWN');

-- CreateEnum
CREATE TYPE "MachineSessionStatus" AS ENUM ('RUNNING', 'PAUSED', 'MAINTENANCE', 'STOPPED');

-- CreateEnum
CREATE TYPE "WageType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "RegisterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workingHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "numHotPresses" INTEGER NOT NULL DEFAULT 1,
    "pressCapacityPerPress" INTEGER NOT NULL DEFAULT 10,
    "glueAlertThresholdKg" DOUBLE PRECISION NOT NULL DEFAULT 1000,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlywoodCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "PlywoodCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlywoodThickness" (
    "id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mm',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "PlywoodThickness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTiming" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "cookingTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coolingTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTiming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlywoodSize" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "sqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "PlywoodSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProduct" (
    "id" TEXT NOT NULL,
    "openingStock" INTEGER NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,

    CONSTRAINT "CompanyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionEntry" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "dailyLogId" TEXT,
    "productionListItemId" TEXT,

    CONSTRAINT "ProductionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProductionLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "supervisorApprovedById" TEXT,
    "supervisorApprovedAt" TIMESTAMP(3),
    "supervisorNotes" TEXT,
    "managerApprovedById" TEXT,
    "managerApprovedAt" TIMESTAMP(3),
    "managerNotes" TEXT,

    CONSTRAINT "DailyProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotPressSession" (
    "id" TEXT NOT NULL,
    "status" "HotPressStatus" NOT NULL DEFAULT 'RUNNING',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopTime" TIMESTAMP(3),
    "numDaylights" INTEGER NOT NULL DEFAULT 10,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "currentCategoryId" TEXT,
    "currentThicknessId" TEXT,
    "currentSizeId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "operatorApprovedAt" TIMESTAMP(3),
    "supervisorApprovedAt" TIMESTAMP(3),
    "managerApprovedAt" TIMESTAMP(3),
    "supervisorId" TEXT,
    "managerId" TEXT,
    "rejectionNote" TEXT,
    "companyId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "machineId" TEXT,
    "currentProductionListItemId" TEXT,

    CONSTRAINT "HotPressSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressEntry" (
    "id" TEXT NOT NULL,
    "type" "PressEntryType" NOT NULL DEFAULT 'COOK',
    "loadTime" TIMESTAMP(3),
    "unloadTime" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productionListItemId" TEXT,

    CONSTRAINT "PressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlueEntry" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barrels" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "GlueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PauseEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "PauseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "estimatedDispatchDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "customerId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCustomization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "OrderCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "layers" INTEGER,
    "brandSeal" BOOLEAN NOT NULL DEFAULT false,
    "varnish" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimelineEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrderTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchLoad" (
    "id" TEXT NOT NULL,
    "loadNumber" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'SUPERVISOR_SUBMITTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "DispatchLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchLoadItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dispatchLoadId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,

    CONSTRAINT "DispatchLoadItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionList" (
    "id" TEXT NOT NULL,
    "listNumber" TEXT NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "estimatedProductionMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdById" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "ProductionList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionListItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "layers" INTEGER,
    "brandSeal" BOOLEAN NOT NULL DEFAULT false,
    "varnish" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productionListId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "producedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readByUsers" TEXT[],
    "targetRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT,
    "productionListId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thickness" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "standardSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'INITIATED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "defectiveUnits" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "section" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMaterial" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "BatchMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "minimumThreshold" INTEGER NOT NULL,
    "location" TEXT,
    "lastRestocked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "InventoryType" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryItemId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineLog" (
    "id" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "action" "MachineAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "section" TEXT,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineAssignment" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MachineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeelingMaterial" (
    "id" TEXT NOT NULL,
    "treeType" TEXT NOT NULL,
    "veneerThickness" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "PeelingMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeelingSession" (
    "id" TEXT NOT NULL,
    "status" "MachineSessionStatus" NOT NULL DEFAULT 'RUNNING',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopTime" TIMESTAMP(3),
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operatorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,

    CONSTRAINT "PeelingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeelingEntry" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "logCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "peelingMaterialId" TEXT NOT NULL,

    CONSTRAINT "PeelingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeelingPauseEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PAUSE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "PeelingPauseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DryerSession" (
    "id" TEXT NOT NULL,
    "status" "MachineSessionStatus" NOT NULL DEFAULT 'RUNNING',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopTime" TIMESTAMP(3),
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "autoCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCheckIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operatorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,

    CONSTRAINT "DryerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DryerBatch" (
    "id" TEXT NOT NULL,
    "veneerThickness" DOUBLE PRECISION NOT NULL,
    "loadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unloadTime" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "DryerBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DryerCheck" (
    "id" TEXT NOT NULL,
    "beltSpeed" DOUBLE PRECISION NOT NULL,
    "dryerTemp" DOUBLE PRECISION NOT NULL,
    "boilerTemp" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "DryerCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DryerPauseEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PAUSE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "DryerPauseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingLog" (
    "id" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operatorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "FinishingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingEntry" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,
    "thicknessId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "finishingLogId" TEXT NOT NULL,

    CONSTRAINT "FinishingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,

    CONSTRAINT "SubDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubDepartmentAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subDepartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubDepartmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,
    "subDepartmentId" TEXT,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "photoData" TEXT,
    "wageType" "WageType" NOT NULL DEFAULT 'DAILY',
    "wageAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "machineId" TEXT,
    "subDepartmentId" TEXT,
    "wageLastAdjustedBy" TEXT,
    "wageLastAdjustedAt" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegister" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "RegisterStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "AttendanceRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "registerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WageAdjustmentLog" (
    "id" TEXT NOT NULL,
    "beforeAmount" DOUBLE PRECISION NOT NULL,
    "afterAmount" DOUBLE PRECISION NOT NULL,
    "wageType" "WageType" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "WageAdjustmentLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "_UserSections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_OrderItemCustomizations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE INDEX "Section_companyId_idx" ON "Section"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_companyId_slug_key" ON "Section"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "User"("createdById");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_name_phone_key" ON "Customer"("companyId", "name", "phone");

-- CreateIndex
CREATE INDEX "PlywoodCategory_companyId_idx" ON "PlywoodCategory"("companyId");

-- CreateIndex
CREATE INDEX "PlywoodThickness_companyId_idx" ON "PlywoodThickness"("companyId");

-- CreateIndex
CREATE INDEX "ProductTiming_companyId_idx" ON "ProductTiming"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTiming_companyId_categoryId_thicknessId_key" ON "ProductTiming"("companyId", "categoryId", "thicknessId");

-- CreateIndex
CREATE INDEX "PlywoodSize_companyId_idx" ON "PlywoodSize"("companyId");

-- CreateIndex
CREATE INDEX "CompanyProduct_companyId_idx" ON "CompanyProduct"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProduct_companyId_categoryId_thicknessId_sizeId_key" ON "CompanyProduct"("companyId", "categoryId", "thicknessId", "sizeId");

-- CreateIndex
CREATE INDEX "ProductionEntry_productId_idx" ON "ProductionEntry"("productId");

-- CreateIndex
CREATE INDEX "ProductionEntry_operatorId_idx" ON "ProductionEntry"("operatorId");

-- CreateIndex
CREATE INDEX "ProductionEntry_dailyLogId_idx" ON "ProductionEntry"("dailyLogId");

-- CreateIndex
CREATE INDEX "ProductionEntry_productionListItemId_idx" ON "ProductionEntry"("productionListItemId");

-- CreateIndex
CREATE INDEX "DailyProductionLog_companyId_idx" ON "DailyProductionLog"("companyId");

-- CreateIndex
CREATE INDEX "DailyProductionLog_operatorId_idx" ON "DailyProductionLog"("operatorId");

-- CreateIndex
CREATE INDEX "DailyProductionLog_status_idx" ON "DailyProductionLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProductionLog_companyId_operatorId_date_key" ON "DailyProductionLog"("companyId", "operatorId", "date");

-- CreateIndex
CREATE INDEX "HotPressSession_companyId_idx" ON "HotPressSession"("companyId");

-- CreateIndex
CREATE INDEX "HotPressSession_operatorId_idx" ON "HotPressSession"("operatorId");

-- CreateIndex
CREATE INDEX "HotPressSession_shiftDate_idx" ON "HotPressSession"("shiftDate");

-- CreateIndex
CREATE INDEX "HotPressSession_approvalStatus_idx" ON "HotPressSession"("approvalStatus");

-- CreateIndex
CREATE INDEX "PressEntry_sessionId_idx" ON "PressEntry"("sessionId");

-- CreateIndex
CREATE INDEX "PressEntry_productionListItemId_idx" ON "PressEntry"("productionListItemId");

-- CreateIndex
CREATE INDEX "GlueEntry_sessionId_idx" ON "GlueEntry"("sessionId");

-- CreateIndex
CREATE INDEX "PauseEvent_sessionId_idx" ON "PauseEvent"("sessionId");

-- CreateIndex
CREATE INDEX "Order_companyId_idx" ON "Order"("companyId");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_companyId_status_idx" ON "Order"("companyId", "status");

-- CreateIndex
CREATE INDEX "OrderCustomization_companyId_idx" ON "OrderCustomization"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCustomization_companyId_name_key" ON "OrderCustomization"("companyId", "name");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderTimelineEvent_companyId_idx" ON "OrderTimelineEvent"("companyId");

-- CreateIndex
CREATE INDEX "OrderTimelineEvent_orderId_idx" ON "OrderTimelineEvent"("orderId");

-- CreateIndex
CREATE INDEX "OrderTimelineEvent_userId_idx" ON "OrderTimelineEvent"("userId");

-- CreateIndex
CREATE INDEX "DispatchLoad_companyId_idx" ON "DispatchLoad"("companyId");

-- CreateIndex
CREATE INDEX "DispatchLoad_orderId_idx" ON "DispatchLoad"("orderId");

-- CreateIndex
CREATE INDEX "DispatchLoad_createdById_idx" ON "DispatchLoad"("createdById");

-- CreateIndex
CREATE INDEX "DispatchLoad_status_idx" ON "DispatchLoad"("status");

-- CreateIndex
CREATE INDEX "DispatchLoad_companyId_orderId_idx" ON "DispatchLoad"("companyId", "orderId");

-- CreateIndex
CREATE INDEX "DispatchLoadItem_dispatchLoadId_idx" ON "DispatchLoadItem"("dispatchLoadId");

-- CreateIndex
CREATE INDEX "ProductionList_companyId_idx" ON "ProductionList"("companyId");

-- CreateIndex
CREATE INDEX "ProductionList_orderId_idx" ON "ProductionList"("orderId");

-- CreateIndex
CREATE INDEX "ProductionListItem_productionListId_idx" ON "ProductionListItem"("productionListId");

-- CreateIndex
CREATE INDEX "Notification_companyId_idx" ON "Notification"("companyId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_companyId_targetRole_idx" ON "Notification"("companyId", "targetRole");

-- CreateIndex
CREATE INDEX "Notification_companyId_userId_idx" ON "Notification"("companyId", "userId");

-- CreateIndex
CREATE INDEX "ProductType_companyId_idx" ON "ProductType"("companyId");

-- CreateIndex
CREATE INDEX "RawMaterial_companyId_idx" ON "RawMaterial"("companyId");

-- CreateIndex
CREATE INDEX "ProductionBatch_companyId_idx" ON "ProductionBatch"("companyId");

-- CreateIndex
CREATE INDEX "ProductionBatch_productTypeId_idx" ON "ProductionBatch"("productTypeId");

-- CreateIndex
CREATE INDEX "ProductionBatch_assignedToId_idx" ON "ProductionBatch"("assignedToId");

-- CreateIndex
CREATE INDEX "BatchMaterial_batchId_idx" ON "BatchMaterial"("batchId");

-- CreateIndex
CREATE INDEX "BatchMaterial_materialId_idx" ON "BatchMaterial"("materialId");

-- CreateIndex
CREATE INDEX "InventoryItem_companyId_idx" ON "InventoryItem"("companyId");

-- CreateIndex
CREATE INDEX "InventoryItem_productTypeId_idx" ON "InventoryItem"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_companyId_productTypeId_key" ON "InventoryItem"("companyId", "productTypeId");

-- CreateIndex
CREATE INDEX "InventoryLog_inventoryItemId_idx" ON "InventoryLog"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryLog_loggedById_idx" ON "InventoryLog"("loggedById");

-- CreateIndex
CREATE INDEX "MachineLog_companyId_idx" ON "MachineLog"("companyId");

-- CreateIndex
CREATE INDEX "MachineLog_operatorId_idx" ON "MachineLog"("operatorId");

-- CreateIndex
CREATE INDEX "MachineLog_shiftDate_idx" ON "MachineLog"("shiftDate");

-- CreateIndex
CREATE INDEX "Machine_companyId_idx" ON "Machine"("companyId");

-- CreateIndex
CREATE INDEX "Machine_sectionId_idx" ON "Machine"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_companyId_code_key" ON "Machine"("companyId", "code");

-- CreateIndex
CREATE INDEX "MachineAssignment_machineId_idx" ON "MachineAssignment"("machineId");

-- CreateIndex
CREATE INDEX "MachineAssignment_userId_idx" ON "MachineAssignment"("userId");

-- CreateIndex
CREATE INDEX "MachineAssignment_companyId_idx" ON "MachineAssignment"("companyId");

-- CreateIndex
CREATE INDEX "PeelingMaterial_companyId_idx" ON "PeelingMaterial"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PeelingMaterial_companyId_treeType_veneerThickness_key" ON "PeelingMaterial"("companyId", "treeType", "veneerThickness");

-- CreateIndex
CREATE INDEX "PeelingSession_operatorId_idx" ON "PeelingSession"("operatorId");

-- CreateIndex
CREATE INDEX "PeelingSession_companyId_idx" ON "PeelingSession"("companyId");

-- CreateIndex
CREATE INDEX "PeelingSession_shiftDate_idx" ON "PeelingSession"("shiftDate");

-- CreateIndex
CREATE INDEX "PeelingEntry_sessionId_idx" ON "PeelingEntry"("sessionId");

-- CreateIndex
CREATE INDEX "PeelingPauseEvent_sessionId_idx" ON "PeelingPauseEvent"("sessionId");

-- CreateIndex
CREATE INDEX "DryerSession_operatorId_idx" ON "DryerSession"("operatorId");

-- CreateIndex
CREATE INDEX "DryerSession_companyId_idx" ON "DryerSession"("companyId");

-- CreateIndex
CREATE INDEX "DryerSession_shiftDate_idx" ON "DryerSession"("shiftDate");

-- CreateIndex
CREATE INDEX "DryerBatch_sessionId_idx" ON "DryerBatch"("sessionId");

-- CreateIndex
CREATE INDEX "DryerCheck_sessionId_idx" ON "DryerCheck"("sessionId");

-- CreateIndex
CREATE INDEX "DryerPauseEvent_sessionId_idx" ON "DryerPauseEvent"("sessionId");

-- CreateIndex
CREATE INDEX "FinishingLog_companyId_idx" ON "FinishingLog"("companyId");

-- CreateIndex
CREATE INDEX "FinishingLog_shiftDate_idx" ON "FinishingLog"("shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinishingLog_operatorId_shiftDate_key" ON "FinishingLog"("operatorId", "shiftDate");

-- CreateIndex
CREATE INDEX "FinishingEntry_finishingLogId_idx" ON "FinishingEntry"("finishingLogId");

-- CreateIndex
CREATE INDEX "SubDepartment_companyId_idx" ON "SubDepartment"("companyId");

-- CreateIndex
CREATE INDEX "SubDepartment_machineId_idx" ON "SubDepartment"("machineId");

-- CreateIndex
CREATE INDEX "SubDepartmentAssignment_userId_idx" ON "SubDepartmentAssignment"("userId");

-- CreateIndex
CREATE INDEX "SubDepartmentAssignment_subDepartmentId_idx" ON "SubDepartmentAssignment"("subDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubDepartmentAssignment_userId_subDepartmentId_key" ON "SubDepartmentAssignment"("userId", "subDepartmentId");

-- CreateIndex
CREATE INDEX "Shift_companyId_idx" ON "Shift"("companyId");

-- CreateIndex
CREATE INDEX "Shift_machineId_idx" ON "Shift"("machineId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_machineId_idx" ON "Employee"("machineId");

-- CreateIndex
CREATE INDEX "Employee_subDepartmentId_idx" ON "Employee"("subDepartmentId");

-- CreateIndex
CREATE INDEX "AttendanceRegister_companyId_idx" ON "AttendanceRegister"("companyId");

-- CreateIndex
CREATE INDEX "AttendanceRegister_shiftId_idx" ON "AttendanceRegister"("shiftId");

-- CreateIndex
CREATE INDEX "AttendanceRegister_supervisorId_idx" ON "AttendanceRegister"("supervisorId");

-- CreateIndex
CREATE INDEX "AttendanceRegister_companyId_date_idx" ON "AttendanceRegister"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRegister_shiftId_date_supervisorId_key" ON "AttendanceRegister"("shiftId", "date", "supervisorId");

-- CreateIndex
CREATE INDEX "AttendanceEntry_registerId_idx" ON "AttendanceEntry"("registerId");

-- CreateIndex
CREATE INDEX "AttendanceEntry_employeeId_idx" ON "AttendanceEntry"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEntry_registerId_employeeId_key" ON "AttendanceEntry"("registerId", "employeeId");

-- CreateIndex
CREATE INDEX "WageAdjustmentLog_employeeId_idx" ON "WageAdjustmentLog"("employeeId");

-- CreateIndex
CREATE INDEX "WageAdjustmentLog_changedById_idx" ON "WageAdjustmentLog"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "GlueStock_companyId_key" ON "GlueStock"("companyId");

-- CreateIndex
CREATE INDEX "GlueStockLog_glueStockId_idx" ON "GlueStockLog"("glueStockId");

-- CreateIndex
CREATE UNIQUE INDEX "_UserSections_AB_unique" ON "_UserSections"("A", "B");

-- CreateIndex
CREATE INDEX "_UserSections_B_index" ON "_UserSections"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OrderItemCustomizations_AB_unique" ON "_OrderItemCustomizations"("A", "B");

-- CreateIndex
CREATE INDEX "_OrderItemCustomizations_B_index" ON "_OrderItemCustomizations"("B");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlywoodCategory" ADD CONSTRAINT "PlywoodCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlywoodThickness" ADD CONSTRAINT "PlywoodThickness_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTiming" ADD CONSTRAINT "ProductTiming_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTiming" ADD CONSTRAINT "ProductTiming_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTiming" ADD CONSTRAINT "ProductTiming_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlywoodSize" ADD CONSTRAINT "PlywoodSize_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyProductionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CompanyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_productionListItemId_fkey" FOREIGN KEY ("productionListItemId") REFERENCES "ProductionListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProductionLog" ADD CONSTRAINT "DailyProductionLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProductionLog" ADD CONSTRAINT "DailyProductionLog_managerApprovedById_fkey" FOREIGN KEY ("managerApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProductionLog" ADD CONSTRAINT "DailyProductionLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProductionLog" ADD CONSTRAINT "DailyProductionLog_supervisorApprovedById_fkey" FOREIGN KEY ("supervisorApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotPressSession" ADD CONSTRAINT "HotPressSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotPressSession" ADD CONSTRAINT "HotPressSession_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotPressSession" ADD CONSTRAINT "HotPressSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressEntry" ADD CONSTRAINT "PressEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressEntry" ADD CONSTRAINT "PressEntry_productionListItemId_fkey" FOREIGN KEY ("productionListItemId") REFERENCES "ProductionListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressEntry" ADD CONSTRAINT "PressEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HotPressSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressEntry" ADD CONSTRAINT "PressEntry_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressEntry" ADD CONSTRAINT "PressEntry_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlueEntry" ADD CONSTRAINT "GlueEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HotPressSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PauseEvent" ADD CONSTRAINT "PauseEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HotPressSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCustomization" ADD CONSTRAINT "OrderCustomization_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEvent" ADD CONSTRAINT "OrderTimelineEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEvent" ADD CONSTRAINT "OrderTimelineEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineEvent" ADD CONSTRAINT "OrderTimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoad" ADD CONSTRAINT "DispatchLoad_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoad" ADD CONSTRAINT "DispatchLoad_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoad" ADD CONSTRAINT "DispatchLoad_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoad" ADD CONSTRAINT "DispatchLoad_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoadItem" ADD CONSTRAINT "DispatchLoadItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoadItem" ADD CONSTRAINT "DispatchLoadItem_dispatchLoadId_fkey" FOREIGN KEY ("dispatchLoadId") REFERENCES "DispatchLoad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoadItem" ADD CONSTRAINT "DispatchLoadItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLoadItem" ADD CONSTRAINT "DispatchLoadItem_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionList" ADD CONSTRAINT "ProductionList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionList" ADD CONSTRAINT "ProductionList_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionList" ADD CONSTRAINT "ProductionList_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionListItem" ADD CONSTRAINT "ProductionListItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionListItem" ADD CONSTRAINT "ProductionListItem_productionListId_fkey" FOREIGN KEY ("productionListId") REFERENCES "ProductionList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionListItem" ADD CONSTRAINT "ProductionListItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionListItem" ADD CONSTRAINT "ProductionListItem_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_productionListId_fkey" FOREIGN KEY ("productionListId") REFERENCES "ProductionList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMaterial" ADD CONSTRAINT "BatchMaterial_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMaterial" ADD CONSTRAINT "BatchMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingMaterial" ADD CONSTRAINT "PeelingMaterial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingSession" ADD CONSTRAINT "PeelingSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingSession" ADD CONSTRAINT "PeelingSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingEntry" ADD CONSTRAINT "PeelingEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeelingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingEntry" ADD CONSTRAINT "PeelingEntry_peelingMaterialId_fkey" FOREIGN KEY ("peelingMaterialId") REFERENCES "PeelingMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeelingPauseEvent" ADD CONSTRAINT "PeelingPauseEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeelingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DryerSession" ADD CONSTRAINT "DryerSession_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DryerSession" ADD CONSTRAINT "DryerSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DryerBatch" ADD CONSTRAINT "DryerBatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DryerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DryerCheck" ADD CONSTRAINT "DryerCheck_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DryerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DryerPauseEvent" ADD CONSTRAINT "DryerPauseEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DryerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingLog" ADD CONSTRAINT "FinishingLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingLog" ADD CONSTRAINT "FinishingLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingEntry" ADD CONSTRAINT "FinishingEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlywoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingEntry" ADD CONSTRAINT "FinishingEntry_thicknessId_fkey" FOREIGN KEY ("thicknessId") REFERENCES "PlywoodThickness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingEntry" ADD CONSTRAINT "FinishingEntry_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "PlywoodSize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingEntry" ADD CONSTRAINT "FinishingEntry_finishingLogId_fkey" FOREIGN KEY ("finishingLogId") REFERENCES "FinishingLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDepartment" ADD CONSTRAINT "SubDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDepartment" ADD CONSTRAINT "SubDepartment_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDepartmentAssignment" ADD CONSTRAINT "SubDepartmentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubDepartmentAssignment" ADD CONSTRAINT "SubDepartmentAssignment_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "SubDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegister" ADD CONSTRAINT "AttendanceRegister_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegister" ADD CONSTRAINT "AttendanceRegister_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegister" ADD CONSTRAINT "AttendanceRegister_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegister" ADD CONSTRAINT "AttendanceRegister_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "AttendanceRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WageAdjustmentLog" ADD CONSTRAINT "WageAdjustmentLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WageAdjustmentLog" ADD CONSTRAINT "WageAdjustmentLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlueStock" ADD CONSTRAINT "GlueStock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlueStockLog" ADD CONSTRAINT "GlueStockLog_glueStockId_fkey" FOREIGN KEY ("glueStockId") REFERENCES "GlueStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSections" ADD CONSTRAINT "_UserSections_A_fkey" FOREIGN KEY ("A") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserSections" ADD CONSTRAINT "_UserSections_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderItemCustomizations" ADD CONSTRAINT "_OrderItemCustomizations_A_fkey" FOREIGN KEY ("A") REFERENCES "OrderCustomization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrderItemCustomizations" ADD CONSTRAINT "_OrderItemCustomizations_B_fkey" FOREIGN KEY ("B") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
