import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Compute smart target quantities for an order
// Accounts for current stock AND quantities already allocated in other production lists
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    // Fetch the order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { category: true, thickness: true, size: true },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Fetch all company products (for stock info)
    const products = await prisma.companyProduct.findMany({
      where: { companyId, isActive: true },
    });

    // Fetch all ACTIVE (non-COMPLETED) production list items for this company
    // These represent stock that is already "reserved" for other production
    const activeProductionItems = await prisma.productionListItem.findMany({
      where: {
        productionList: {
          companyId,
          status: { notIn: ["COMPLETED"] },
          // Exclude production lists already linked to THIS order
          orderId: { not: orderId },
        },
      },
    });

    // Build a map of already-allocated quantities: key = "catId-thickId-sizeId"
    const allocatedMap: Record<string, number> = {};
    activeProductionItems.forEach((item) => {
      const key = `${item.categoryId}-${item.thicknessId}-${item.sizeId}`;
      allocatedMap[key] = (allocatedMap[key] || 0) + (item.quantity - ((item as any).producedQuantity || 0));
    });

    // Also check production lists already created FOR this order
    const existingListsForOrder = await prisma.productionListItem.findMany({
      where: {
        productionList: {
          companyId,
          orderId: orderId,
          status: { notIn: ["COMPLETED"] },
        },
      },
    });
    const alreadyPlannedForOrder: Record<string, number> = {};
    existingListsForOrder.forEach((item) => {
      const key = `${item.categoryId}-${item.thicknessId}-${item.sizeId}`;
      alreadyPlannedForOrder[key] = (alreadyPlannedForOrder[key] || 0) + item.quantity;
    });

    // Compute booked stock from other active orders
    const activeOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          companyId,
          status: { notIn: ["COMPLETED", "CANCELLED", "DISPATCHED"] },
          id: { not: orderId },
        },
      },
    });

    const bookedElsewhereMap: Record<string, number> = {};
    activeOrderItems.forEach((item) => {
      const key = `${item.categoryId}-${item.thicknessId}-${item.sizeId}`;
      bookedElsewhereMap[key] = (bookedElsewhereMap[key] || 0) + item.quantity;
    });

    // Compute smart target for each order item
    const smartItems = order.items.map((item) => {
      const key = `${item.categoryId}-${item.thicknessId}-${item.sizeId}`;
      const product = products.find(
        (p) => p.categoryId === item.categoryId && p.thicknessId === item.thicknessId && p.sizeId === item.sizeId
      );

      const currentStock = product?.currentStock || 0;
      const allocatedElsewhere = allocatedMap[key] || 0;
      const bookedElsewhere = bookedElsewhereMap[key] || 0;
      const alreadyPlanned = alreadyPlannedForOrder[key] || 0;

      // Available stock is current stock minus stock booked by other active orders
      const availableStock = Math.max(0, currentStock - bookedElsewhere);

      // Target = ordered quantity - available stock - already planned for THIS order
      const targetQuantity = Math.max(0, item.quantity - availableStock - alreadyPlanned);

      return {
        categoryId: item.categoryId,
        categoryName: item.category?.name,
        thicknessId: item.thicknessId,
        thicknessValue: (item.thickness as any)?.value,
        sizeId: item.sizeId,
        sizeLabel: (item.size as any)?.label,
        orderedQuantity: item.quantity,
        currentStock,
        allocatedElsewhere,
        bookedElsewhere,
        availableStock,
        alreadyPlanned,
        targetQuantity,
        layers: item.layers,
        brandSeal: item.brandSeal,
        varnish: item.varnish,
        skip: targetQuantity === 0,
      };
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: smartItems,
    });
  } catch (error) {
    console.error("Error computing smart targets:", error);
    return NextResponse.json({ error: "Failed to compute" }, { status: 500 });
  }
}
