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
    if (!["MANAGER", "OWNER"].includes(role)) {
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
    // if body.customerPhone is passed, we might update the customer as well, but for now we skip updating their phone on order update.

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    // If items are provided, replace all items
    if (body.items) {
      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      await prisma.orderItem.createMany({
        data: body.items.map((item: any) => ({
          orderId: id,
          categoryId: item.categoryId,
          thicknessId: item.thicknessId,
          sizeId: item.sizeId,
          quantity: parseInt(item.quantity),
          layers: item.layers ? parseInt(item.layers) : null,
          brandSeal: item.brandSeal || false,
          varnish: item.varnish || false,
          notes: item.notes || null,
        })),
      });
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
        priority: "HIGH" as const,
        targetRole,
        companyId,
        orderId: order.id,
      })),
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
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
        priority: "HIGH" as const,
        targetRole,
        companyId,
        orderId: id,
      })),
    });

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
