const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateApi() {
  try {
    const company = await prisma.company.findFirst();
    const section = await prisma.section.findFirst();
    if (!company || !section) return console.log("Missing test data");

    const companyId = company.id;
    const sectionId = section.id;
    const name = "API Sim Machine";
    const code = "SIM-" + Math.floor(Math.random() * 100);

    // Simulated Logic
    const existing = await prisma.machine.findFirst({
      where: { companyId, code: code.toUpperCase() },
    });
    if (existing) return console.log("Exists");

    const count = await prisma.machine.count({ where: { companyId, sectionId } });

    const machine = await prisma.machine.create({
      data: {
        name,
        code: code.toUpperCase(),
        sectionId,
        companyId,
        sortOrder: count + 1,
        isActive: true,
      },
      include: {
        section: { select: { id: true, name: true, slug: true } },
        assignments: {
          where: { removedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    console.log("SUCCESS:", machine.id);
  } catch (e) {
    console.error("FAILURE DETAIL:", e);
    if (e.stack) console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

simulateApi();
