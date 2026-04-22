import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (["DISPATCHED", "CANCELLED"].includes(order.status)) {
      return NextResponse.json({ error: "Order already dispatched or cancelled" }, { status: 400 });
    }

    // Process dispatch in a transaction
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Find the company product matching the category, thickness, size
        const companyProduct = await tx.companyProduct.findUnique({
          where: {
            companyId_categoryId_thicknessId_sizeId: {
              companyId: order.companyId,
              categoryId: item.categoryId,
              thicknessId: item.thicknessId,
              sizeId: item.sizeId,
            }
          }
        });

        if (companyProduct) {
          // Deduct quantity, log if goes below 0 but don't strictly prevent (as per inventory realness)
          const deductQty = item.quantity;
          const newStock = Math.max(0, companyProduct.currentStock - deductQty); // Prevents dropping negative unexpectedly

          await tx.companyProduct.update({
            where: { id: companyProduct.id },
            data: { currentStock: newStock }
          });
        }
      }

      // Mark order as DISPATCHED
      await tx.order.update({
        where: { id: order.id },
        data: { status: "DISPATCHED" }
      });
      
      // Update any related production lists to COMPLETED
      await tx.productionList.updateMany({
        where: { orderId: order.id, status: { not: "COMPLETED" } },
        data: { status: "COMPLETED" }
      });
    });

    return NextResponse.json({ success: true, message: "Order dispatched and stock deducted" });
  } catch (error) {
    console.error("Error dispatching order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
