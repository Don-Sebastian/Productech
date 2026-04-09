import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "MANAGER") {
      return NextResponse.json({ error: "Only managers can update dispatch loads" }, { status: 403 });
    }

    const loadId = (await params).id;
    const body = await request.json();
    const { status, items } = body;

    if (status && !["MANAGER_CONFIRMED", "DISPATCHED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.quantity !== undefined) {
          await prisma.dispatchLoadItem.update({
            where: { id: item.id },
            data: { quantity: parseInt(item.quantity) }
          });
        }
      }
    }

    // Only proceed to status update if a status is actually provided
    if (!status) {
       return NextResponse.json({ success: true });
    }

    // Include items so we can update stock if status becomes DISPATCHED
    const load = await prisma.dispatchLoad.findUnique({
      where: { id: loadId },
      include: { items: true, order: true },
    });

    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Deduct stock if DISPATCHED and it wasn't already dispatched
    if (status === "DISPATCHED" && load.status !== "DISPATCHED") {
      // For each item, decrement the CompanyProduct currentStock
      for (const item of load.items) {
        const product = await prisma.companyProduct.findUnique({
          where: {
            companyId_categoryId_thicknessId_sizeId: {
              companyId: load.companyId,
              categoryId: item.categoryId,
              thicknessId: item.thicknessId,
              sizeId: item.sizeId,
            }
          }
        });

        if (product) {
          await prisma.companyProduct.update({
            where: { id: product.id },
            data: { currentStock: { decrement: item.quantity } } // Subtract inventory
          });
        }
      }

      // Update Order timeline to Dispatch
      await prisma.orderTimelineEvent.create({
        data: {
          companyId: load.companyId,
          orderId: load.orderId,
          action: "Order Dispatched",
          details: `Load ${load.loadNumber} dispatched. Inventory updated.`,
          userId: (session.user as any).id,
        }
      });
      
      // Update Order Status to DISPATCHED
      await prisma.order.update({
        where: { id: load.orderId },
        data: { status: "DISPATCHED" }
      });
    }

    const updated = await prisma.dispatchLoad.update({
      where: { id: loadId },
      data: { 
        status, 
        managerId: (session.user as any).id,
        updatedAt: new Date()
      },
    });

    if (status === "MANAGER_CONFIRMED" || status === "DISPATCHED") {
      await prisma.notification.create({
        data: {
          companyId: load.companyId,
          targetRole: "SUPERVISOR",
          type: "DISPATCH",
          title: `Dispatch Load ${status === "DISPATCHED" ? "Completed" : "Confirmed"}`,
          message: `Manager confirmed load ${load.loadNumber}.`,
          priority: 3,
        }
      });
    }

    if (status === "DISPATCHED") {
      await prisma.notification.create({
        data: {
          companyId: load.companyId,
          targetRole: "OWNER",
          type: "DISPATCH",
          title: "Dispatch Load Completed",
          message: `Load ${load.loadNumber} dispatched. Inventory has been updated.`,
          priority: 3,
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dispatch load:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "MANAGER") {
      return NextResponse.json({ error: "Only managers can delete dispatch loads" }, { status: 403 });
    }

    const loadId = (await params).id;
    const load = await prisma.dispatchLoad.findUnique({
      where: { id: loadId },
      include: { items: true }
    });

    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (load.status === "DISPATCHED") {
      // Restore inventory and reset order status
      for (const item of load.items) {
        const product = await prisma.companyProduct.findUnique({
          where: {
            companyId_categoryId_thicknessId_sizeId: {
              companyId: load.companyId,
              categoryId: item.categoryId,
              thicknessId: item.thicknessId,
              sizeId: item.sizeId,
            }
          }
        });
        if (product) {
          await prisma.companyProduct.update({
            where: { id: product.id },
            data: { currentStock: { increment: item.quantity } }
          });
        }
      }

      await prisma.order.update({
        where: { id: load.orderId },
        data: { status: "READY_FOR_DISPATCH" }
      });
    }

    await prisma.dispatchLoad.delete({
      where: { id: loadId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dispatch load:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
