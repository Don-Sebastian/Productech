import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch a single production list
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const list = await prisma.productionList.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            category: true,
            thickness: true,
            size: true,
            productionEntries: {
              include: { operator: { select: { name: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            priority: true,
            status: true,
            customer: { select: { name: true } },
            items: {
              include: { category: true, thickness: true, size: true },
            },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PUT - Update production list (priority, status, completion)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const { id } = await params;
    const body = await request.json();

    const list = await prisma.productionList.findUnique({
      where: { id },
      include: { items: true, order: true },
    });

    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = {};

    // Supervisor can update priority
    if (body.priority !== undefined && ["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      updateData.priority = Math.max(1, Math.min(5, parseInt(body.priority)));
    }

    // Supervisor can update status
    if (body.status && ["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      updateData.status = body.status;
    }

    // Operator initiates completion (now moves directly to COMPLETED)
    if (body.action === "REQUEST_COMPLETION" && role === "OPERATOR") {
      // Check if all items have met their target
      const listWithItems = await prisma.productionList.findUnique({
        where: { id },
        include: { items: true },
      });
      
      const allMet = listWithItems?.items.every(
        (item: any) => item.producedQuantity >= item.quantity
      );
      
      if (!allMet) {
        return NextResponse.json({ error: "Not all items have met their target quantity" }, { status: 400 });
      }

      updateData.status = "COMPLETED";
      
      // Update associated order if all its production lists are complete
      if (list.orderId) {
        const allLists = await prisma.productionList.findMany({
          where: { orderId: list.orderId, id: { not: id } },
        });
        
        const allOthersComplete = allLists.every((l) => l.status === "COMPLETED");
        
        if (allOthersComplete) {
          await prisma.order.update({
            where: { id: list.orderId },
            data: { status: "PRODUCTION_COMPLETED" },
          });

          // Create timeline event for order
          await prisma.orderTimelineEvent.create({
            data: {
              action: "PRODUCTION_COMPLETED",
              details: `All production lists completed. Order is ready for dispatch.`,
              companyId,
              orderId: list.orderId,
              userId,
            },
          });

          // Notify manager about completion
          await prisma.notification.create({
            data: {
              type: "ORDER_READY",
              title: "🎉 Order Production Complete!",
              message: `Order ${list.order?.orderNumber} - All production is complete. Ready for dispatch!`,
              priority: 1,
              targetRole: "MANAGER",
              companyId,
              orderId: list.orderId,
            } as any,
          });
        }

        // Always create timeline event for individual list completion
        await prisma.orderTimelineEvent.create({
          data: {
            action: "LIST_COMPLETED",
            details: `Production list ${list.listNumber} marked as complete by operator.`,
            companyId,
            orderId: list.orderId,
            userId,
          },
        });
      }

      // Notify relevant roles
      const notifRoles = ["SUPERVISOR", "MANAGER"];
      await prisma.notification.createMany({
        data: notifRoles.map((targetRole) => ({
          type: "PRODUCTION_COMPLETED",
          title: "✅ Production List Completed",
          message: `Production list ${list.listNumber} has been completed by operator.`,
          priority: 2,
          targetRole,
          companyId,
          productionListId: list.id,
        })) as any[],
      });
    }

    // Supervisor approves completion (Keep legacy support for Supervisor/Manager to also mark as complete)
    if (body.action === "APPROVE_COMPLETION" && ["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      // Re-use logic if needed, but the primary flow is now the operator one above
      updateData.status = "COMPLETED";
      // ... logic similar to above can be added or we can keep it simple as a fallback
    }

    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.productionList.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { category: true, thickness: true, size: true } },
        order: { select: { id: true, orderNumber: true, customer: { select: { name: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating production list:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
