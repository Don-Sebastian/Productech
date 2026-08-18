import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const materials = await prisma.rawMaterial.findMany({
      where: { companyId },
      include: {
        standardCosts: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(materials);
  } catch (error: any) {
    console.error("[RAWMATERIALS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, category, unit, currentRate, description } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
    }

    const rate = parseFloat(currentRate) || 0;
    const catName = category?.trim() || "Wood / Timber";

    const material = await prisma.$transaction(async (tx) => {
      const mat = await tx.rawMaterial.create({
        data: {
          name: name.trim(),
          category: catName,
          unit: unit.trim(),
          currentRate: rate,
          description: description?.trim() || null,
          companyId
        }
      });

      // Also create/update standard cost config if rate > 0
      if (rate > 0 && session?.user?.id) {
        const existingStandardCost = await tx.standardCostConfig.findFirst({
          where: { companyId, materialId: mat.id },
        });

        if (existingStandardCost) {
          await tx.standardCostConfig.update({
            where: { id: existingStandardCost.id },
            data: {
              standardPrice: rate,
              effectiveFrom: new Date(),
            },
          });
        } else {
          await tx.standardCostConfig.create({
            data: {
              companyId,
              materialId: mat.id,
              standardPrice: rate,
              effectiveFrom: new Date(),
              createdById: (session.user as any).id,
            },
          });
        }
      }

      return mat;
    });

    return NextResponse.json(material);
  } catch (error: any) {
    console.error("[RAWMATERIALS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

