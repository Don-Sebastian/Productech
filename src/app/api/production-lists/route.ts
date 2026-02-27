import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch production lists
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const lists = await prisma.productionList.findMany({
      where: { companyId },
      include: {
        items: {
          include: { category: true, thickness: true, size: true },
        },
        order: { select: { id: true, orderNumber: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lists);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - Create production list (Supervisor only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;

    const { orderId, notes, items } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });
    }

    // Generate list number
    const count = await prisma.productionList.count({ where: { companyId } });
    const listNumber = `PROD-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const list = await prisma.productionList.create({
      data: {
        listNumber,
        notes: notes || null,
        companyId,
        orderId: orderId || null,
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
          })),
        },
      },
      include: {
        items: { include: { category: true, thickness: true, size: true } },
      },
    });

    // If linked to an order, update order status
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "IN_PRODUCTION" },
      });
    }

    // Send high-priority notifications to all operator sections
    const operatorSections = ["peeling", "drying", "hotpress", "finishing"];
    const notifData = operatorSections.map((section) => ({
      type: "PRODUCTION_LIST",
      title: "🏭 New Production List",
      message: `Production list ${listNumber} created with ${items.length} item(s). Check your section for tasks.`,
      priority: "URGENT" as const,
      targetRole: "OPERATOR",
      companyId,
      productionListId: list.id,
    }));

    // Also notify supervisors
    notifData.push({
      type: "PRODUCTION_LIST",
      title: "🏭 Production List Created",
      message: `${listNumber} — ${items.length} items ready for production.`,
      priority: "HIGH" as const,
      targetRole: "SUPERVISOR",
      companyId,
      productionListId: list.id,
    });

    await prisma.notification.createMany({ data: notifData });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating production list:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
