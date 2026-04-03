import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    const whereClause: any = { companyId };
    if (orderId) whereClause.orderId = orderId;

    const loads = await prisma.dispatchLoad.findMany({
      where: whereClause,
      include: {
        order: { select: { id: true, orderNumber: true, customer: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        manager: { select: { name: true } },
        items: {
          include: {
            category: { select: { id: true, name: true } },
            thickness: { select: { id: true, value: true } },
            size: { select: { id: true, label: true } },
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(loads);
  } catch (error) {
    console.error("Error fetching dispatch loads:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "SUPERVISOR" && role !== "MANAGER") {
      return NextResponse.json({ error: "Only supervisors and managers can create dispatch loads" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    if (!companyId || !userId) return NextResponse.json({ error: "Invalid user data" }, { status: 400 });

    const body = await request.json();
    const { orderId, notes, items } = body;

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Order ID and items are required" }, { status: 400 });
    }

    // Generate load number
    const count = await prisma.dispatchLoad.count({ where: { companyId } });
    const loadNumber = `DISP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const load = await prisma.dispatchLoad.create({
      data: {
        loadNumber,
        companyId,
        orderId,
        createdById: userId,
        notes,
        status: "SUPERVISOR_SUBMITTED",
        items: {
          create: items.map((i: any) => ({
            categoryId: i.categoryId,
            thicknessId: i.thicknessId,
            sizeId: i.sizeId,
            quantity: parseInt(i.quantity, 10),
            notes: i.notes,
          })),
        }
      },
      include: { items: true },
    });

    // Notify Manager
    await prisma.notification.create({
      data: {
        companyId,
        targetRole: "MANAGER",
        type: "PRODUCTION_LIST",
        title: "New Dispatch Load Submitted",
        message: `Supervisor ${(session.user as any).name} submitted ${loadNumber} for order. Needs your confirmation.`,
        priority: "NORMAL",
      }
    });
    
    // Update order status if not already READY_FOR_DISPATCH
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "READY_FOR_DISPATCH" }
    });

    return NextResponse.json(load, { status: 201 });
  } catch (error) {
    console.error("Error creating dispatch load:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
