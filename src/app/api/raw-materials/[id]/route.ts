import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, category, unit, currentRate, description, isFaceMaterial } = body;

    const material = await prisma.rawMaterial.findFirst({
      where: { id, companyId },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // If marking as face material, unmark any existing face material first (only one allowed)
    if (isFaceMaterial === true) {
      await prisma.rawMaterial.updateMany({
        where: { companyId, isFaceMaterial: true },
        data: { isFaceMaterial: false },
      });
    }

    const updateData: any = {};
    if (typeof isFaceMaterial === "boolean") updateData.isFaceMaterial = isFaceMaterial;
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (unit !== undefined) updateData.unit = unit.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (currentRate !== undefined) {
      const rate = parseFloat(currentRate) || 0;
      updateData.currentRate = rate;

      // Sync standard cost config
      if (rate > 0 && session?.user?.id) {
        const existingStandardCost = await prisma.standardCostConfig.findFirst({
          where: { companyId, materialId: id },
        });

        if (existingStandardCost) {
          await prisma.standardCostConfig.update({
            where: { id: existingStandardCost.id },
            data: {
              standardPrice: rate,
              effectiveFrom: new Date(),
            },
          });
        } else {
          await prisma.standardCostConfig.create({
            data: {
              companyId,
              materialId: id,
              standardPrice: rate,
              effectiveFrom: new Date(),
              createdById: (session.user as any).id,
            },
          });
        }
      }
    }

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating material:", error);
    return NextResponse.json({ error: "Failed to update material", details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const companyId = (session?.user as any)?.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const material = await prisma.rawMaterial.findFirst({
      where: { id, companyId },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    await prisma.rawMaterial.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting material:", error);
    return NextResponse.json({ error: "Failed to delete material", details: error.message }, { status: 500 });
  }
}

