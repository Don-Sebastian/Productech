import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calcEstimatedDates } from "@/lib/productionEstimate";

// GET - Fetch production lists
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const [lists, company, productTimings] = await Promise.all([
      prisma.productionList.findMany({
        where: { companyId },
        select: {
          id: true,
          listNumber: true,
          priority: true,
          status: true,
          notes: true,
          estimatedProductionMinutes: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              producedQuantity: true,
              layers: true,
              brandSeal: true,
              varnish: true,
              notes: true,
              categoryId: true,
              thicknessId: true,
              sizeId: true,
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
          order: {
            select: {
              id: true,
              orderNumber: true,
              priority: true,
              status: true,
              createdAt: true,
              customer: { select: { name: true } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "asc" } as any, { createdAt: "desc" } as any],
      }),
      prisma.company.findUnique({ where: { id: companyId }, select: { workingHoursPerDay: true, numHotPresses: true, pressCapacityPerPress: true } }),
      (prisma as any).productTiming.findMany({ where: { companyId } }),
    ]);

    const pressSettings = {
      workingHoursPerDay: (company as any)?.workingHoursPerDay ?? 8,
      numHotPresses: (company as any)?.numHotPresses ?? 1,
      pressCapacityPerPress: (company as any)?.pressCapacityPerPress ?? 10,
    };

    return NextResponse.json({ lists, pressSettings, productTimings });
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

    const { orderId, notes, priority, items } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });
    }

    // Validate priority (1-5, default 3)
    const listPriority = priority ? Math.max(1, Math.min(5, parseInt(priority))) : 3;

    // Fetch everything in parallel — was 3 sequential queries, now 1 parallel batch
    const [count, company, productTimings] = await Promise.all([
      prisma.productionList.count({ where: { companyId } }),
      prisma.company.findUnique({ where: { id: companyId }, select: { workingHoursPerDay: true, numHotPresses: true, pressCapacityPerPress: true } }),
      prisma.productTiming.findMany({ where: { companyId } }),
    ]);
    const listNumber = `PROD-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const pressSettings = {
      workingHoursPerDay: (company as any)?.workingHoursPerDay ?? 8,
      numHotPresses: (company as any)?.numHotPresses ?? 1,
      pressCapacityPerPress: (company as any)?.pressCapacityPerPress ?? 10,
    };

    // Calculate production minutes
    const totalMinutes = items.reduce((sum: number, item: any) => {
      const qty = parseInt(item.quantity) || 0;
      const timing = productTimings.find(
        (pt: any) => pt.categoryId === item.categoryId && pt.thicknessId === item.thicknessId
      );
      const cooking = timing?.cookingTime ?? 0;
      const cooling = timing?.coolingTime ?? 0;
      
      const totalBoardsPerCycle = pressSettings.numHotPresses * pressSettings.pressCapacityPerPress;
      const cycles = Math.ceil(qty / Math.max(totalBoardsPerCycle, 1));
      return sum + (cycles * (cooking + cooling));
    }, 0);

    const safeTotalMinutes = isNaN(totalMinutes) ? 0 : Math.round(totalMinutes);

    const createData: any = {
      listNumber,
      priority: listPriority,
      notes: notes || null,
      companyId,
      orderId: orderId || null,
      createdById: userId,
      estimatedProductionMinutes: safeTotalMinutes,
      items: {
        create: items.map((item: any, idx: number) => {
          if (!item.categoryId || !item.thicknessId || !item.sizeId) {
            console.error(`[PROD-LIST] Item ${idx} is missing IDs:`, { 
              cat: item.categoryId, 
              thick: item.thicknessId, 
              size: item.sizeId 
            });
          }
          return {
            categoryId: item.categoryId,
            thicknessId: item.thicknessId,
            sizeId: item.sizeId,
            quantity: parseInt(item.quantity) || 0,
            producedQuantity: 0,
            layers: item.layers ? (parseInt(item.layers) || null) : null,
            brandSeal: item.brandSeal || false,
            varnish: item.varnish || false,
            notes: item.notes || null,
          };
        }),
      },
    };

    console.log("[PROD-LIST] Attempting Create with data:", JSON.stringify(createData, null, 2));

    let list;
    try {
      const validItems = items.filter((item: any) => item.categoryId && item.thicknessId && item.sizeId);
      
      if (validItems.length === 0) {
        return NextResponse.json({ error: "No valid products selected (missing category/thickness/size)" }, { status: 400 });
      }

      list = await prisma.productionList.create({
        data: {
          listNumber,
          priority: listPriority,
          notes: notes || null,
          companyId,
          orderId: orderId || null,
          createdById: userId,
          estimatedProductionMinutes: safeTotalMinutes,
          items: {
            create: validItems.map((item: any) => ({
              categoryId: item.categoryId,
              thicknessId: item.thicknessId,
              sizeId: item.sizeId,
              quantity: parseInt(item.quantity) || 0,
              layers: item.layers ? (parseInt(item.layers) || null) : null,
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
    } catch (createError: any) {
      console.error("[PROD-LIST] Database Create Error:", createError);
      console.error("[PROD-LIST] Items provided:", JSON.stringify(items, null, 2));
      return NextResponse.json({ 
        error: "Database error during creation", 
        details: createError.message,
        code: createError.code,
        meta: createError.meta,
        itemCount: items.length
      }, { status: 500 });
    }

    // If linked to an order, update order status and estimated dispatch date
    if (orderId && list) {
      try {
        const finishingDays = 1; 
        const { dispatchDate } = calcEstimatedDates(new Date(), safeTotalMinutes, pressSettings, finishingDays);
        
        const updateData: any = { status: "IN_PRODUCTION" };
        if (!isNaN(dispatchDate.getTime())) {
          updateData.estimatedDispatchDate = dispatchDate;
        }

        await prisma.order.update({
          where: { id: orderId },
          data: updateData,
        });

        // Create timeline event
        await prisma.orderTimelineEvent.create({
          data: {
            action: "PRODUCTION_LIST_CREATED",
            details: `Production list ${listNumber} created.${!isNaN(dispatchDate.getTime()) ? ` Est. Dispatch: ${dispatchDate.toLocaleDateString('en-IN')}` : ''}`,
            companyId,
            orderId,
            userId,
          },
        });
      } catch (orderError) {
        console.error("[PROD-LIST] Order Update Error:", orderError);
        // We don't fail the whole request here, but we log it
      }
    }

    // Send notifications
    try {
      const notifData: any[] = [
        {
          type: "PRODUCTION_LIST",
          title: "🏭 New Production List",
          message: `Production list ${listNumber} created with ${items.length} item(s). Priority: ${listPriority}.`,
          priority: Math.max(1, listPriority - 1),
          targetRole: "OPERATOR",
          companyId,
          productionListId: list.id,
        },
        {
          targetRole: "SUPERVISOR",
          type: "PRODUCTION_LIST",
          title: "🏭 Production List Created",
          message: `${listNumber} — ${items.length} items ready for production.`,
          priority: listPriority,
          companyId,
          productionListId: list.id,
        },
        {
          targetRole: "MANAGER",
          type: "PRODUCTION_LIST",
          title: "🏭 Production List Created",
          message: `${listNumber} — ${items.length} items.`,
          priority: listPriority,
          companyId,
          productionListId: list.id,
        },
      ];

      await prisma.notification.createMany({ data: notifData });
    } catch (notifError) {
      console.error("[PROD-LIST] Notification error:", notifError);
    }

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Critical error creating production list:", error);
    return NextResponse.json({ error: "Critical failure", details: (error as any).message }, { status: 500 });
  }
}
