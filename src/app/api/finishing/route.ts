import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const shiftDate = new Date();
    shiftDate.setHours(0, 0, 0, 0);

    const [todayLog, products, productionLists] = await Promise.all([
      (prisma as any).finishingLog.findUnique({
        where: { operatorId_shiftDate: { operatorId: userId, shiftDate } },
        include: {
          entries: {
            orderBy: { timestamp: "desc" },
            include: {
              category: { select: { id: true, name: true } },
              thickness: { select: { id: true, value: true } },
              size: { select: { id: true, label: true, length: true, width: true } },
            },
          },
        },
      }),
      prisma.companyProduct.findMany({
        where: { companyId, isActive: true },
        include: {
          category: { select: { id: true, name: true, sortOrder: true } },
          thickness: { select: { id: true, value: true } },
          size: { select: { id: true, label: true, length: true, width: true } },
        },
        orderBy: [
          { category: { sortOrder: "desc" } },
          { thickness: { value: "desc" } },
          { size: { length: "desc" } },
          { size: { width: "desc" } },
        ],
      }),
      prisma.productionList.findMany({
        where: { companyId, status: { not: "COMPLETED" } },
        include: {
          order: { select: { orderNumber: true, customer: { select: { name: true } } } },
          items: {
            include: {
              category: { select: { id: true, name: true, sortOrder: true } },
              thickness: { select: { id: true, value: true } },
              size: { select: { id: true, label: true, length: true, width: true } },
            },
            orderBy: [
              { category: { sortOrder: "desc" } },
              { thickness: { value: "desc" } },
              { size: { length: "desc" } },
              { size: { width: "desc" } },
            ],
          },
        },
        orderBy: { priority: "asc" },
      }),
    ]);

    return NextResponse.json({ todayLog, products, productionLists });
  } catch (e) {
    console.error("Finishing GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await req.json();
    const { action } = body;

    const shiftDate = new Date();
    shiftDate.setHours(0, 0, 0, 0);

    // Ensure today's log exists (upsert)
    const getOrCreateLog = async () => {
      let log = await (prisma as any).finishingLog.findUnique({
        where: { operatorId_shiftDate: { operatorId: userId, shiftDate } },
      });
      if (!log) {
        log = await (prisma as any).finishingLog.create({
          data: { operatorId: userId, companyId, shiftDate },
        });
      }
      return log;
    };

    switch (action) {
      case "addEntry": {
        const { categoryId, thicknessId, sizeId, quantity, notes } = body;
        if (!categoryId || !thicknessId || !sizeId || !quantity) {
          return NextResponse.json({ error: "Product and quantity required" }, { status: 400 });
        }
        const log = await getOrCreateLog();
        const entry = await (prisma as any).finishingEntry.create({
          data: {
            finishingLogId: log.id,
            categoryId,
            thicknessId,
            sizeId,
            quantity: parseInt(quantity),
            notes: notes || null,
          },
          include: {
            category: { select: { id: true, name: true } },
            thickness: { select: { id: true, value: true } },
            size: { select: { id: true, label: true, length: true, width: true } },
          },
        });
        return NextResponse.json(entry);
      }

      case "deleteEntry": {
        const { entryId } = body;
        await (prisma as any).finishingEntry.delete({ where: { id: entryId } });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("Finishing POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
