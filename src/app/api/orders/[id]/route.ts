import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch single order
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { category: true, thickness: true, size: true } },
        createdBy: { select: { id: true, name: true } },
        customer: true,
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PUT - Update order
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const companyId = (session.user as any).companyId;
    const body = await request.json();

    // Update order fields
    const updateData: any = {};
    if (body.customerName) {
      let customer = await prisma.customer.findFirst({ where: { companyId, name: body.customerName }});
      if (!customer) customer = await prisma.customer.create({ data: { name: body.customerName, companyId }});
      updateData.customerId = customer.id;
    }

    if (body.status) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = Math.max(1, Math.min(5, parseInt(body.priority)));
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    // If items are provided, replace all items and RESET THE ORDER FLOW
    if (body.items && Array.isArray(body.items)) {
      // First delete associated items that might block list deletion
      await prisma.productionList.deleteMany({ where: { orderId: id } });

      // Reset order status and estimates
      updateData.status = "PENDING";
      updateData.estimatedDispatchDate = null;
      updateData.estimatedProductionMinutes = null;

      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      
      const itemData = body.items.map((item: any) => {
        const qty = parseInt(item.quantity);
        if (isNaN(qty)) throw new Error("Invalid quantity provided");
        
        return {
          orderId: id,
          categoryId: item.categoryId,
          thicknessId: item.thicknessId,
          sizeId: item.sizeId,
          quantity: qty,
          layers: (item.layers && !isNaN(parseInt(item.layers))) ? parseInt(item.layers) : null,
          brandSeal: !!item.brandSeal,
          varnish: !!item.varnish,
          notes: item.notes || null,
        };
      });

      await prisma.orderItem.createMany({ data: itemData });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { category: true, thickness: true, size: true } },
      },
    });

    // Send update notification
    const targetRoles = ["SUPERVISOR", "OPERATOR"];
    await prisma.notification.createMany({
      data: targetRoles.map((targetRole) => ({
        type: "ORDER_UPDATED",
        title: "⚠️ Order Updated",
        message: `Order ${order.orderNumber} has been updated. Status: ${order.status}. Check for changes.`,
        priority: 1,
        targetRole,
        companyId,
        orderId: order.id,
      })) as any[],
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Order Update Error Details:", error);
    return NextResponse.json({ 
      error: "Failed to update order", 
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete order
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const companyId = (session.user as any).companyId;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Notify about cancellation
    await prisma.notification.createMany({
      data: ["SUPERVISOR", "OPERATOR"].map((targetRole) => ({
        type: "ORDER_CANCELLED",
        title: "❌ Order Cancelled",
        message: `Order ${order.orderNumber} has been cancelled.`,
        priority: 1,
        targetRole,
        companyId,
        orderId: id,
      })) as any[],
    });

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
