import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const transferSchema = z.object({
  sourceCompanyId: z.string(),
  targetCompanyId: z.string(),
  productTypeId: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden. Only owners can transfer stock." }, { status: 403 });
    }

    const body = await request.json();
    const result = transferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error }, { status: 400 });
    }

    const { sourceCompanyId, targetCompanyId, productTypeId, quantity, notes } = result.data;
    const userId = session.user.id as string;

    // Ensure the user owns both companies
    const ownedCompanies = (session.user as any).ownedCompanies || [];
    const ownsSource = ownedCompanies.some((c: any) => c.id === sourceCompanyId);
    const ownsTarget = ownedCompanies.some((c: any) => c.id === targetCompanyId);

    if (!ownsSource || !ownsTarget) {
      return NextResponse.json({ error: "You do not have access to one or both of these companies." }, { status: 403 });
    }

    if (sourceCompanyId === targetCompanyId) {
      return NextResponse.json({ error: "Cannot transfer to the same company." }, { status: 400 });
    }

    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Get Source Product Type
      const sourceProductType = await tx.productType.findUnique({
        where: { id: productTypeId },
      });

      if (!sourceProductType) {
        throw new Error("Source Product Type not found");
      }

      // 2. Read Source Inventory Item
      const sourceItem = await tx.inventoryItem.findUnique({
        where: {
          companyId_productTypeId: {
            companyId: sourceCompanyId,
            productTypeId,
          },
        },
      });

      if (!sourceItem || sourceItem.quantity < quantity) {
        throw new Error("Insufficient stock in source company");
      }

      // 3. Find or Create Target Product Type (match by name & thickness)
      let targetProductType = await tx.productType.findFirst({
        where: {
          companyId: targetCompanyId,
          name: sourceProductType.name,
          thickness: sourceProductType.thickness,
        },
      });

      if (!targetProductType) {
        targetProductType = await tx.productType.create({
          data: {
            name: sourceProductType.name,
            thickness: sourceProductType.thickness,
            description: sourceProductType.description,
            standardSize: sourceProductType.standardSize,
            companyId: targetCompanyId,
          },
        });
      }

      // 4. Find or Create Target Inventory Item
      let targetItem = await tx.inventoryItem.findUnique({
        where: {
          companyId_productTypeId: {
            companyId: targetCompanyId,
            productTypeId: targetProductType.id,
          },
        },
      });

      if (!targetItem) {
        targetItem = await tx.inventoryItem.create({
          data: {
            quantity: 0,
            minimumThreshold: sourceItem.minimumThreshold || 0,
            companyId: targetCompanyId,
            productTypeId: targetProductType.id,
          },
        });
      }

      // 5. Update Quantities
      const updatedSourceItem = await tx.inventoryItem.update({
        where: { id: sourceItem.id },
        data: { quantity: { decrement: quantity } },
      });

      const updatedTargetItem = await tx.inventoryItem.update({
        where: { id: targetItem.id },
        data: { quantity: { increment: quantity } },
      });

      // 6. Create Logs
      await tx.inventoryLog.create({
        data: {
          quantity: -quantity,
          type: "OUTBOUND",
          reason: `Inter-company transfer to company ID ${targetCompanyId} - ${notes || ''}`,
          inventoryItemId: sourceItem.id,
          loggedById: userId,
        },
      });

      await tx.inventoryLog.create({
        data: {
          quantity,
          type: "INBOUND",
          reason: `Inter-company transfer from company ID ${sourceCompanyId} - ${notes || ''}`,
          inventoryItemId: targetItem.id,
          loggedById: userId,
        },
      });

      // 7. Create Audit Record
      const transferRecord = await tx.inventoryTransfer.create({
        data: {
          sourceCompanyId,
          targetCompanyId,
          productTypeId: sourceProductType.id,
          quantity,
          transferredById: userId,
          notes,
        },
      });

      return { transferRecord, updatedSourceItem, updatedTargetItem };
    });

    return NextResponse.json(txResult);

  } catch (error: any) {
    console.error("Transfer Error:", error);
    if (error.message === "Insufficient stock in source company" || error.message === "Source Product Type not found") {
       return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
