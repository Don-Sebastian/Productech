const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Prisma instance keys:", Object.keys(prisma).filter(k => !k.startsWith("_")).slice(0, 20));
    const companyId = "cmm62186o0001o6hl21nnasii"; 
    const cats = await prisma.plywoodCategory.findMany({ where: { companyId } });
    const thicks = await prisma.plywoodThickness.findMany({ where: { companyId } });
    
    if (cats.length > 0 && thicks.length > 0) {
      console.log("Testing upsert for cat:", cats[0].id, "thick:", thicks[0].id);
      const timing = await prisma.productTiming.upsert({
        where: {
          companyId_categoryId_thicknessId: {
            companyId,
            categoryId: cats[0].id,
            thicknessId: thicks[0].id,
          },
        },
        update: { cookingTime: 10, coolingTime: 20 },
        create: {
          companyId,
          categoryId: cats[0].id,
          thicknessId: thicks[0].id,
          cookingTime: 10,
          coolingTime: 20,
        },
      });
      console.log("Upsert success:", timing);
    }
  } catch (err) {
    console.error("DEBUG ERROR:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
