import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch orders for a company (paginated)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const take = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const skip = parseInt(searchParams.get("offset") || "0");
    const statusFilter = searchParams.get("status");

    const where: any = { companyId };
    if (statusFilter) where.status = statusFilter;

    const [orders, total, company, productTimings] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          priority: true,
          status: true,
          notes: true,
          dueDate: true,
          estimatedDispatchDate: true,
          createdAt: true,
          customer: { select: { name: true, phone: true } },
          createdBy: { select: { name: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              layers: true,
              brandSeal: true,
              varnish: true,
              categoryId: true,
              thicknessId: true,
              category: { select: { name: true, sortOrder: true } },
              thickness: { select: { value: true } },
              size: { select: { label: true, length: true, width: true } },
              customizations: { select: { name: true } },
            },
            orderBy: [
              { category: { sortOrder: "desc" } },
              { thickness: { value: "desc" } },
              { size: { length: "desc" } },
              { size: { width: "desc" } },
            ],
          },
          productionLists: {
            select: {
              status: true,
              items: { select: { quantity: true, producedQuantity: true } },
            },
          },
          // Timeline events excluded from list — fetch per-order on detail view
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.order.count({ where }),
      prisma.company.findUnique({ where: { id: companyId }, select: { workingHoursPerDay: true, numHotPresses: true, pressCapacityPerPress: true } }),
      (prisma as any).productTiming.findMany({ where: { companyId } }),
    ]);

    const pressSettings = {
      workingHoursPerDay: (company as any)?.workingHoursPerDay ?? 8,
      numHotPresses: (company as any)?.numHotPresses ?? 1,
      pressCapacityPerPress: (company as any)?.pressCapacityPerPress ?? 10,
    };

    return NextResponse.json({ orders, total, pressSettings, productTimings });
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

    // Validate priority (1-5, default 3)
    const orderPriority = priority ? Math.max(1, Math.min(5, parseInt(priority))) : 3;

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
        priority: orderPriority as any,
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
    const priorityLabel = orderPriority <= 2 ? "🔴 HIGH" : orderPriority === 3 ? "🟡 NORMAL" : "🟢 LOW";
    const targetRoles = ["SUPERVISOR", "OPERATOR"];
    const notifData = targetRoles.map((targetRole) => ({
      type: "NEW_ORDER",
      title: "🚨 New Order Received",
      message: `Order ${orderNumber} from ${customerName} — ${items.length} item(s). Priority: ${priorityLabel}`,
      priority: Math.max(1, orderPriority - 1) as any,
      targetRole,
      companyId,
      orderId: order.id,
    }));

    await prisma.notification.createMany({ data: notifData });

    // Timeline event
    await prisma.orderTimelineEvent.create({
      data: {
        companyId,
        orderId: order.id,
        action: "Order Created",
        details: `Order created for ${customerName} with ${items.length} items.`,
        userId: userId,
      }
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
