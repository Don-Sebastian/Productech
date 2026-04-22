import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Helper: batch-fetch all CompanyProducts matching load items in ONE query
async function fetchProductsForItems(companyId: string, items: { categoryId: string; thicknessId: string; sizeId: string }[]) {
  const products = await prisma.companyProduct.findMany({
    where: {
      companyId,
      OR: items.map(i => ({
        categoryId: i.categoryId,
        thicknessId: i.thicknessId,
        sizeId: i.sizeId,
      })),
    },
    select: {
      id: true,
      currentStock: true,
      categoryId: true,
      thicknessId: true,
      sizeId: true,
      category: { select: { name: true } },
      thickness: { select: { value: true } },
      size: { select: { label: true } },
    },
  });
  // Index by composite key for O(1) lookup
  const map = new Map<string, typeof products[0]>();
  for (const p of products) {
    map.set(`${p.categoryId}|${p.thicknessId}|${p.sizeId}`, p);
  }
  return map;
}

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

    // Handle item quantity edits (no status change)
    if (items && Array.isArray(items)) {
      const updates = items
        .filter((item: any) => item.id && item.quantity !== undefined)
        .map((item: any) =>
          prisma.dispatchLoadItem.update({
            where: { id: item.id },
            data: { quantity: parseInt(item.quantity) },
          })
        );
      if (updates.length > 0) await prisma.$transaction(updates);
    }

    if (!status) {
      return NextResponse.json({ success: true });
    }

    const load = await prisma.dispatchLoad.findUnique({
      where: { id: loadId },
      include: { items: true, order: true },
    });

    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = (session.user as any).id;

    // ── DISPATCH: Stock validation + atomic deduction ──
    if (status === "DISPATCHED" && load.status !== "DISPATCHED") {
      const productMap = await fetchProductsForItems(load.companyId, load.items);

      // Pre-check: ensure no item would go negative
      const shortages: { product: string; currentStock: number; requested: number }[] = [];
      for (const item of load.items) {
        const key = `${item.categoryId}|${item.thicknessId}|${item.sizeId}`;
        const product = productMap.get(key);
        if (!product) {
          shortages.push({ product: `Unknown product`, currentStock: 0, requested: item.quantity });
        } else if (product.currentStock < item.quantity) {
          shortages.push({
            product: `${product.category.name} • ${product.thickness.value}mm • ${product.size.label}`,
            currentStock: product.currentStock,
            requested: item.quantity,
          });
        }
      }

      if (shortages.length > 0) {
        return NextResponse.json(
          { error: "INSUFFICIENT_STOCK", shortages },
          { status: 409 }
        );
      }

      // All clear — atomic transaction: deduct stock + update status + timeline + notifications
      const txOps: any[] = [];

      // Stock deductions
      for (const item of load.items) {
        const key = `${item.categoryId}|${item.thicknessId}|${item.sizeId}`;
        const product = productMap.get(key)!;
        txOps.push(
          prisma.companyProduct.update({
            where: { id: product.id },
            data: { currentStock: { decrement: item.quantity } },
          })
        );
      }

      // Update dispatch load status
      txOps.push(
        prisma.dispatchLoad.update({
          where: { id: loadId },
          data: { status: "DISPATCHED", managerId: userId, updatedAt: new Date() },
        })
      );

      // Update order status
      txOps.push(
        prisma.order.update({
          where: { id: load.orderId },
          data: { status: "DISPATCHED" },
        })
      );

      // Timeline event
      txOps.push(
        prisma.orderTimelineEvent.create({
          data: {
            companyId: load.companyId,
            orderId: load.orderId,
            action: "Order Dispatched",
            details: `Load ${load.loadNumber} dispatched. Inventory updated.`,
            userId,
          },
        })
      );

      // Notifications
      txOps.push(
        prisma.notification.create({
          data: {
            companyId: load.companyId,
            targetRole: "SUPERVISOR",
            type: "DISPATCH",
            title: "Dispatch Load Completed",
            message: `Manager confirmed load ${load.loadNumber}.`,
            priority: 3,
          },
        })
      );
      txOps.push(
        prisma.notification.create({
          data: {
            companyId: load.companyId,
            targetRole: "OWNER",
            type: "DISPATCH",
            title: "Dispatch Load Completed",
            message: `Load ${load.loadNumber} dispatched. Inventory has been updated.`,
            priority: 3,
          },
        })
      );

      await prisma.$transaction(txOps);

      return NextResponse.json({ success: true, status: "DISPATCHED" });
    }

    // ── MANAGER_CONFIRMED: simple status update ──
    const updated = await prisma.dispatchLoad.update({
      where: { id: loadId },
      data: { status, managerId: userId, updatedAt: new Date() },
    });

    if (status === "MANAGER_CONFIRMED") {
      await Promise.all([
        prisma.orderTimelineEvent.create({
          data: {
            companyId: load.companyId,
            orderId: load.orderId,
            action: "Dispatch Confirmed",
            details: `Manager confirmed dispatch load ${load.loadNumber}.`,
            userId,
          },
        }),
        prisma.notification.create({
          data: {
            companyId: load.companyId,
            targetRole: "SUPERVISOR",
            type: "DISPATCH",
            title: "Dispatch Load Confirmed",
            message: `Manager confirmed load ${load.loadNumber}.`,
            priority: 3,
          },
        }),
      ]);
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
      include: { items: true },
    });

    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (load.status === "DISPATCHED") {
      // Batch-fetch products for restore
      const productMap = await fetchProductsForItems(load.companyId, load.items);

      const txOps: any[] = [];
      for (const item of load.items) {
        const key = `${item.categoryId}|${item.thicknessId}|${item.sizeId}`;
        const product = productMap.get(key);
        if (product) {
          txOps.push(
            prisma.companyProduct.update({
              where: { id: product.id },
              data: { currentStock: { increment: item.quantity } },
            })
          );
        }
      }
      txOps.push(
        prisma.order.update({
          where: { id: load.orderId },
          data: { status: "READY_FOR_DISPATCH" },
        })
      );
      txOps.push(
        prisma.dispatchLoad.delete({ where: { id: loadId } })
      );

      await prisma.$transaction(txOps);
    } else {
      await prisma.dispatchLoad.delete({ where: { id: loadId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dispatch load:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
