import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getCompanyId(sessionUser: any): Promise<string | null> {
  if (sessionUser?.companyId) return sessionUser.companyId;
  if (sessionUser?.ownedCompanies?.length > 0) return sessionUser.ownedCompanies[0].id;
  if (sessionUser?.id) {
    const comp = await prisma.company.findFirst({
      where: { ownerId: sessionUser.id },
      select: { id: true },
    });
    if (comp) return comp.id;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = await getCompanyId(session.user);
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const budget = await prisma.budgetConfig.findFirst({
      where: { companyId },
      orderBy: { effectiveFrom: 'desc' }
    });

    return NextResponse.json(budget || { budgetedMonthlyOverhead: 0, budgetedMonthlySheets: 0 });
  } catch (error) {
    console.error("[BUDGET_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = await getCompanyId(session.user);
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await request.json();
    const { budgetedMonthlyOverhead, budgetedMonthlySheets } = body;

    const createdById = session.user.id;
    if (!createdById) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    const overhead = typeof budgetedMonthlyOverhead === 'number'
      ? budgetedMonthlyOverhead
      : parseFloat(budgetedMonthlyOverhead);
    const sanitizedOverhead = isNaN(overhead) ? 0 : Math.max(0, overhead);

    const sheets = typeof budgetedMonthlySheets === 'number'
      ? budgetedMonthlySheets
      : parseInt(budgetedMonthlySheets, 10);
    const sanitizedSheets = isNaN(sheets) ? 0 : Math.max(0, sheets);

    const newBudget = await prisma.budgetConfig.create({
      data: {
        companyId,
        budgetedMonthlyOverhead: sanitizedOverhead,
        budgetedMonthlySheets: sanitizedSheets,
        createdById
      }
    });

    return NextResponse.json(newBudget);
  } catch (error) {
    console.error("[BUDGET_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
