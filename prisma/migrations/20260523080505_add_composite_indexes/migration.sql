-- CreateIndex
CREATE INDEX "DryerSession_companyId_status_idx" ON "DryerSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "DryerSession_companyId_shiftDate_status_idx" ON "DryerSession"("companyId", "shiftDate", "status");

-- CreateIndex
CREATE INDEX "FinishingLog_companyId_shiftDate_idx" ON "FinishingLog"("companyId", "shiftDate");

-- CreateIndex
CREATE INDEX "HotPressSession_companyId_status_idx" ON "HotPressSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "HotPressSession_companyId_shiftDate_status_idx" ON "HotPressSession"("companyId", "shiftDate", "status");

-- CreateIndex
CREATE INDEX "HotPressSession_operatorId_companyId_status_idx" ON "HotPressSession"("operatorId", "companyId", "status");

-- CreateIndex
CREATE INDEX "MachineAssignment_userId_role_idx" ON "MachineAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "PeelingSession_companyId_status_idx" ON "PeelingSession"("companyId", "status");

-- CreateIndex
CREATE INDEX "PeelingSession_companyId_shiftDate_status_idx" ON "PeelingSession"("companyId", "shiftDate", "status");
