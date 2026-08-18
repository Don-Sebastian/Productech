import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    // Fetch materials with their latest standard rate
    const materials = await prisma.rawMaterial.findMany({
      where: { companyId },
      include: {
        standardCosts: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    const rates = materials.map(m => ({
      materialId: m.id,
      name: m.name,
      unit: m.unit,
      standardPrice: m.standardCosts.length > 0 ? m.standardCosts[0].standardPrice : 0,
      effectiveFrom: m.standardCosts.length > 0 ? m.standardCosts[0].effectiveFrom : null
    }));

    return NextResponse.json(rates);
  } catch (error) {
    console.error("[STANDARD_RATES_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await request.json();
    const { rates } = body; // Array of { materialId, standardPrice }

    if (!Array.isArray(rates)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const createdById = session.user.id;
    if (!createdById) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    // For simplicity, just insert new records for the updated rates. 
    // They will be the newest and therefore the "current" rates.
    const createPromises = rates.map((rate: any) => {
      const price = typeof rate.standardPrice === 'number'
        ? rate.standardPrice
        : parseFloat(rate.standardPrice);
      const sanitizedPrice = isNaN(price) ? 0 : Math.max(0, price);

      return prisma.standardCostConfig.create({
        data: {
          companyId,
          materialId: rate.materialId,
          standardPrice: sanitizedPrice,
          createdById
        }
      });
    });

    await Promise.all(createPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STANDARD_RATES_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
