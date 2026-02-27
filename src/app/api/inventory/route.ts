import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch inventory for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;

    const inventory = await prisma.inventoryItem.findMany({
      where: { companyId },
      include: {
        productType: true,
        inventoryLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
          include: { loggedBy: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

// POST - Log inventory movement
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { inventoryItemId, quantity, type, reason } = await request.json();

    if (!inventoryItemId || quantity === undefined || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create inventory log
    const log = await prisma.inventoryLog.create({
      data: {
        inventoryItemId,
        quantity: parseInt(quantity),
        type,
        reason,
        loggedById: userId,
      },
    });

    // Update inventory item quantity
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (inventoryItem) {
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity: inventoryItem.quantity + parseInt(quantity),
          lastRestocked: new Date(),
        },
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Error logging inventory:", error);
    return NextResponse.json(
      { error: "Failed to log inventory" },
      { status: 500 },
    );
  }
}
