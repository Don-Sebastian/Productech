import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch production entries for today (or a specific date)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    // Build where clause based on role
    const where: any = {
      createdAt: { gte: date, lt: endDate },
    };

    if (role === "OPERATOR") {
      // Operators see only their own entries
      where.operatorId = userId;
    } else {
      // Others see all entries for the company
      where.product = { companyId };
    }

    const entries = await prisma.productionEntry.findMany({
      where,
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true } },
          },
        },
        operator: { select: { name: true } },
        productionListItem: {
          include: {
            productionList: { select: { listNumber: true, priority: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also get the daily log status
    const dailyLog = await prisma.dailyProductionLog.findFirst({
      where: {
        companyId,
        operatorId: role === "OPERATOR" ? userId : undefined,
        date,
      },
    });

    return NextResponse.json({ entries, dailyLog });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - Add a production entry (Operator only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "OPERATOR") {
      return NextResponse.json({ error: "Only operators can add production" }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;

    const { productId, categoryId, thicknessId, sizeId, quantity, notes, productionListItemId } = await request.json();

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }

    let finalProductId = productId;

    // Auto-resolve or create CompanyProduct if catalog IDs are provided
    if (!finalProductId && categoryId && thicknessId && sizeId) {
      const existingProduct = await prisma.companyProduct.findUnique({
        where: {
          companyId_categoryId_thicknessId_sizeId: {
            companyId, categoryId, thicknessId, sizeId
          }
        }
      });

      if (existingProduct) {
        finalProductId = existingProduct.id;
        if (!existingProduct.isActive) {
          await prisma.companyProduct.update({ where: { id: finalProductId }, data: { isActive: true } });
        }
      } else {
        const newProduct = await prisma.companyProduct.create({
          data: { companyId, categoryId, thicknessId, sizeId, isActive: true, currentStock: 0, openingStock: 0 }
        });
        finalProductId = newProduct.id;
      }
    }

    if (!finalProductId) {
      return NextResponse.json({ error: "Product or Catalog IDs required" }, { status: 400 });
    }

    // Check if there's already a submitted log for today (can't add more)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingLog = await prisma.dailyProductionLog.findFirst({
      where: {
        companyId,
        operatorId: userId,
        date: today,
        status: { not: "PENDING" },
      },
    });

    if (existingLog && existingLog.status !== "REJECTED") {
      return NextResponse.json({ error: "Today's production already submitted for approval" }, { status: 400 });
    }

    // Create entry
    const entry = await prisma.productionEntry.create({
      data: {
        productId: finalProductId,
        quantity: parseInt(quantity),
        notes: notes || null,
        operatorId: userId,
        productionListItemId: productionListItemId || null,
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true } },
          },
        },
      },
    });

    // If linked to a production list item, update the producedQuantity
    if (productionListItemId) {
      await prisma.productionListItem.update({
        where: { id: productionListItemId },
        data: { producedQuantity: { increment: parseInt(quantity) } },
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// DELETE - Remove a production entry (only if not yet submitted)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const entry = await prisma.productionEntry.findUnique({
      where: { id },
      include: { dailyLog: true },
    });

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Can't delete if already submitted
    if (entry.dailyLog && entry.dailyLog.status !== "PENDING" && entry.dailyLog.status !== "REJECTED") {
      return NextResponse.json({ error: "Cannot delete - already submitted" }, { status: 400 });
    }

    // If linked to a production list item, decrement the producedQuantity
    if (entry.productionListItemId) {
      await prisma.productionListItem.update({
        where: { id: entry.productionListItemId },
        data: { producedQuantity: { decrement: entry.quantity } },
      });
    }

    await prisma.productionEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
