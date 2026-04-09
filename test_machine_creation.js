const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const company = await prisma.company.findFirst();
    const section = await prisma.section.findFirst();
    if (!company || !section) {
      console.log("No company or section found");
      return;
    }

    console.log(`Testing with Company: ${company.id}, Section: ${section.id}`);
    
    const machine = await prisma.machine.create({
      data: {
        name: "Test Machine " + Date.now(),
        code: "TM" + Math.floor(Math.random() * 1000),
        sectionId: section.id,
        companyId: company.id,
        sortOrder: 1
      }
    });
    console.log("Success:", machine);
  } catch (e) {
    console.error("Error Detail:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
