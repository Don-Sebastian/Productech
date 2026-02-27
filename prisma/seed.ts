import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  console.log("🧹 Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.glueEntry.deleteMany();
  await prisma.pauseEvent.deleteMany();
  await prisma.pressEntry.deleteMany();
  await prisma.hotPressSession.deleteMany();
  await prisma.productionEntry.deleteMany();
  await prisma.dailyProductionLog.deleteMany();
  await prisma.productionListItem.deleteMany();
  await prisma.productionList.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.companyProduct.deleteMany();
  await prisma.plywoodSize.deleteMany();
  await prisma.plywoodThickness.deleteMany();
  await prisma.plywoodCategory.deleteMany();
  await prisma.section.deleteMany();
  await prisma.machineLog.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.batchMaterial.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  console.log("✓ Database cleaned\n");

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const demoPassword = await bcrypt.hash("demo123", 10);

  // ==================== ADMIN ====================
  const admin = await prisma.user.create({
    data: { email: "admin@crply.com", password: hashedPassword, name: "Platform Admin", role: "ADMIN" },
  });
  console.log(`✓ Admin: ${admin.email}`);

  // ==================== COMPANY ====================
  const company = await prisma.company.create({
    data: { name: "CRPLY Demo Plywood", email: "demo@crply.com", phone: "+91 9876543210", location: "Kochi, Kerala" },
  });

  // ==================== SECTIONS ====================
  const sectionHotpress = await prisma.section.create({
    data: { name: "Hot Press", slug: "hotpress", companyId: company.id, sortOrder: 1 },
  });
  const sectionPeeling = await prisma.section.create({
    data: { name: "Peeling", slug: "peeling", companyId: company.id, sortOrder: 2 },
  });
  const sectionDrying = await prisma.section.create({
    data: { name: "Drying", slug: "drying", companyId: company.id, sortOrder: 3 },
  });
  const sectionFinishing = await prisma.section.create({
    data: { name: "Finishing", slug: "finishing", companyId: company.id, sortOrder: 4 },
  });
  console.log(`✓ 4 sections`);

  // ==================== USERS ====================
  const owner = await prisma.user.create({
    data: { email: "owner@demo.com", password: demoPassword, name: "Rajesh Kumar", role: "OWNER", phone: "+91 9876543211", companyId: company.id, createdById: admin.id },
  });
  const manager = await prisma.user.create({
    data: { email: "manager@demo.com", password: demoPassword, name: "Suresh Menon", role: "MANAGER", phone: "+91 9876543212", companyId: company.id, createdById: owner.id },
  });
  const supervisor = await prisma.user.create({
    data: { email: "supervisor@demo.com", password: demoPassword, name: "Anil Nair", role: "SUPERVISOR", section: "hotpress", companyId: company.id, createdById: manager.id },
  });
  const pressOperator = await prisma.user.create({
    data: { email: "press@demo.com", password: demoPassword, name: "Vijay Thomas", role: "OPERATOR", section: "hotpress", companyId: company.id, createdById: manager.id },
  });
  console.log(`✓ 5 users`);

  // ==================== PLYWOOD CATALOG ====================
  const catPacking = await prisma.plywoodCategory.create({ data: { name: "Packing", companyId: company.id, sortOrder: 1 } });
  const catSemi = await prisma.plywoodCategory.create({ data: { name: "Semi", companyId: company.id, sortOrder: 2 } });
  const catAlternate = await prisma.plywoodCategory.create({ data: { name: "Alternate", companyId: company.id, sortOrder: 3 } });
  console.log(`✓ 3 categories`);

  // Thicknesses (will display in descending order: 18, 12, 10, 8, 6, 4)
  const thicknessValues = [4, 6, 8, 10, 12, 18];
  const thicknesses: Record<number, any> = {};
  for (let i = 0; i < thicknessValues.length; i++) {
    const v = thicknessValues[i];
    thicknesses[v] = await prisma.plywoodThickness.create({ data: { value: v, companyId: company.id, sortOrder: i } });
  }
  console.log(`✓ ${thicknessValues.length} thicknesses`);

  // Sizes (will display sorted: 8×4, 8×3, 7×4, 7×3, 6×4, 6×3)
  const sizeData = [
    { label: "8×4", length: 8, width: 4 },
    { label: "8×3", length: 8, width: 3 },
    { label: "7×4", length: 7, width: 4 },
    { label: "7×3", length: 7, width: 3 },
    { label: "6×4", length: 6, width: 4 },
    { label: "6×3", length: 6, width: 3 },
  ];
  const sizes: Record<string, any> = {};
  for (let i = 0; i < sizeData.length; i++) {
    const s = sizeData[i];
    sizes[s.label] = await prisma.plywoodSize.create({ data: { ...s, companyId: company.id, sortOrder: i } });
  }
  console.log(`✓ ${sizeData.length} sizes`);

  // ==================== COMPANY PRODUCTS ====================
  const productConfigs = [
    { cat: catPacking, thick: thicknesses[4], sizes: ["8×4", "7×4", "6×4"], stocks: [150, 80, 60] },
    { cat: catPacking, thick: thicknesses[6], sizes: ["8×4", "8×3", "7×4"], stocks: [100, 50, 70] },
    { cat: catSemi, thick: thicknesses[8], sizes: ["8×4", "7×4", "7×3"], stocks: [200, 120, 90] },
    { cat: catSemi, thick: thicknesses[10], sizes: ["8×4", "8×3"], stocks: [180, 100] },
    { cat: catAlternate, thick: thicknesses[12], sizes: ["8×4", "7×4", "6×4"], stocks: [250, 150, 100] },
    { cat: catAlternate, thick: thicknesses[18], sizes: ["8×4", "7×4"], stocks: [130, 80] },
  ];

  let productCount = 0;
  for (const config of productConfigs) {
    for (let i = 0; i < config.sizes.length; i++) {
      await prisma.companyProduct.create({
        data: {
          companyId: company.id,
          categoryId: config.cat.id,
          thicknessId: config.thick.id,
          sizeId: sizes[config.sizes[i]].id,
          openingStock: config.stocks[i],
          currentStock: config.stocks[i],
        },
      });
      productCount++;
    }
  }
  console.log(`✓ ${productCount} company products`);

  // ==================== SAMPLE ORDER ====================
  await prisma.order.create({
    data: {
      orderNumber: "ORD-2026-001", customerName: "Kerala Timber Traders", customerPhone: "+91 9000000100",
      status: "CONFIRMED", priority: "HIGH", companyId: company.id, createdById: manager.id,
      items: { create: [
        { categoryId: catAlternate.id, thicknessId: thicknesses[12].id, sizeId: sizes["8×4"].id, quantity: 200, brandSeal: true },
      ] },
    },
  });
  console.log(`✓ 1 sample order`);

  // ==================== DONE ====================
  console.log("\n" + "=".repeat(50));
  console.log("✅ Database seeding completed!");
  console.log("=".repeat(50));
  console.log("\n📋 Login Credentials:");
  console.log("─".repeat(40));
  console.log("Admin:      admin@crply.com / admin123");
  console.log("Owner:      owner@demo.com / demo123");
  console.log("Manager:    manager@demo.com / demo123");
  console.log("Supervisor: supervisor@demo.com / demo123");
  console.log("Press Op:   press@demo.com / demo123");
  console.log("─".repeat(40));
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
