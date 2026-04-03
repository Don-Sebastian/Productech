import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch all orders for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const orders = await prisma.order.findMany({
      where: { companyId },
      include: {
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } },
        items: {
          include: {
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true } },
            customizations: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Only managers and owners can create orders" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;

    const { customerName, customerPhone, priority, notes, dueDate, items } = await request.json();

    if (!customerName || !items || items.length === 0) {
      return NextResponse.json({ error: "Customer name and at least one item required" }, { status: 400 });
    }

    // Generate order number
    const count = await prisma.order.count({ where: { companyId } });
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    let customer = await prisma.customer.findFirst({ where: { companyId, name: customerName } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: customerName, phone: customerPhone, companyId }
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        priority: priority || "NORMAL",
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        companyId,
        createdById: userId,
        items: {
          create: items.map((item: any) => ({
            categoryId: item.categoryId,
            thicknessId: item.thicknessId,
            sizeId: item.sizeId,
            quantity: parseInt(item.quantity),
            layers: item.layers ? parseInt(item.layers) : null,
            brandSeal: item.brandSeal || false,
            varnish: item.varnish || false,
            notes: item.notes || null,
            customizations: item.customizations?.length > 0 
              ? { connect: item.customizations.map((id: string) => ({ id })) } 
              : undefined,
          })),
        },
      },
      include: {
        items: {
          include: { category: true, thickness: true, size: true, customizations: true },
        },
      },
    });

    // Create high-priority notifications for supervisors and operators
    const targetRoles = ["SUPERVISOR", "OPERATOR"];
    const notifData = targetRoles.map((targetRole) => ({
      type: "NEW_ORDER",
      title: "🚨 New Order Received",
      message: `Order ${orderNumber} from ${customerName} — ${items.length} item(s). Priority: ${priority || "NORMAL"}`,
      priority: priority === "URGENT" ? "URGENT" as const : "HIGH" as const,
      targetRole,
      companyId,
      orderId: order.id,
    }));

    await prisma.notification.createMany({ data: notifData });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
