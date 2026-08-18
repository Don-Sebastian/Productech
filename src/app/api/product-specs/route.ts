import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const thicknessId = searchParams.get("thicknessId");

    const query: any = { companyId };
    if (categoryId) query.categoryId = categoryId;
    if (thicknessId) query.thicknessId = thicknessId;

    const specs = await prisma.plywoodProductSpec.findMany({
      where: query,
      include: {
        category: true,
        thickness: true,
        bomItems: {
          include: {
            material: true,
          },
        },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { thickness: { value: "asc" } },
      ],
    });

    return NextResponse.json(specs);
  } catch (error: any) {
    console.error("Error fetching product specs:", error);
    return NextResponse.json({ error: "Failed to fetch product specs", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categoryId, thicknessId, weightPerSheetKg, longCore, glueCore, notes, bomItems } = body;

    if (!categoryId || !thicknessId || weightPerSheetKg === undefined || longCore === undefined || glueCore === undefined) {
      return NextResponse.json({ error: "Missing required fields (categoryId, thicknessId, weightPerSheetKg, longCore, glueCore)" }, { status: 400 });
    }

    // Filter and sanitize BOM items (ignore empty rows or invalid quantities)
    const rawBom = Array.isArray(bomItems) ? bomItems : [];
    const validBomMap = new Map<string, number>();

    for (const item of rawBom) {
      if (item && item.materialId && typeof item.materialId === "string") {
        const matId = item.materialId.trim();
        if (matId) {
          const qty = parseFloat(item.quantity);
          if (!isNaN(qty) && qty > 0) {
            // Aggregate if same material is selected multiple times
            validBomMap.set(matId, (validBomMap.get(matId) || 0) + qty);
          }
        }
      }
    }

    // Verify raw materials belong to this company
    const materialIds = Array.from(validBomMap.keys());
    let cleanBomList: { materialId: string; quantity: number }[] = [];
    if (materialIds.length > 0) {
      const existingMaterials = await prisma.rawMaterial.findMany({
        where: {
          id: { in: materialIds },
          companyId,
        },
        select: { id: true },
      });
      const validMatIdSet = new Set(existingMaterials.map((m) => m.id));

      cleanBomList = materialIds
        .filter((matId) => validMatIdSet.has(matId))
        .map((matId) => ({
          materialId: matId,
          quantity: validBomMap.get(matId)!,
        }));
    }

    // Run spec upsert and BOM sync inside a database transaction
    const spec = await prisma.$transaction(async (tx) => {
      const upserted = await tx.plywoodProductSpec.upsert({
        where: {
          companyId_categoryId_thicknessId: {
            companyId,
            categoryId,
            thicknessId,
          },
        },
        update: {
          weightPerSheetKg: parseFloat(weightPerSheetKg) || 0,
          longCore: parseInt(longCore, 10) || 0,
          glueCore: parseInt(glueCore, 10) || 0,
          notes: notes || null,
        },
        create: {
          companyId,
          categoryId,
          thicknessId,
          weightPerSheetKg: parseFloat(weightPerSheetKg) || 0,
          longCore: parseInt(longCore, 10) || 0,
          glueCore: parseInt(glueCore, 10) || 0,
          notes: notes || null,
        },
      });

      // Clear existing BOM items for this spec
      await tx.productSpecBOMItem.deleteMany({
        where: { specId: upserted.id },
      });

      // Create new clean BOM items
      if (cleanBomList.length > 0) {
        await tx.productSpecBOMItem.createMany({
          data: cleanBomList.map((item) => ({
            specId: upserted.id,
            materialId: item.materialId,
            quantity: item.quantity,
            companyId,
          })),
        });
      }

      return tx.plywoodProductSpec.findUnique({
        where: { id: upserted.id },
        include: {
          category: true,
          thickness: true,
          bomItems: {
            include: {
              material: true,
            },
          },
        },
      });
    });

    return NextResponse.json(spec);
  } catch (error: any) {
    console.error("Error saving product spec:", error);
    return NextResponse.json({ error: "Failed to save product spec", details: error.message }, { status: 500 });
  }
}

