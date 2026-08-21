import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { format, startOfMonth, subMonths } from "date-fns";

const SQFT_TO_SQM = 0.0929;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const role = (session.user as any).role;
    if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const costingMode = request.nextUrl.searchParams.get("costingMode") || "actual";

    // ── 1. Revenue (dispatched items)
    const dispatches = await prisma.dispatchLoadItem.findMany({
      where: {
        dispatchLoad: { companyId, status: "DISPATCHED" },
        salePricePerSqft: { not: null },
      },
      include: {
        size: { select: { sqft: true } },
        dispatchLoad: { select: { updatedAt: true } },
      },
    });

    let totalRevenue = 0;
    dispatches.forEach((item) => {
      const sqft = (item.size?.sqft || 0) * item.quantity;
      totalRevenue += sqft * (item.salePricePerSqft || 0);
    });

    // ── 2. COGS
    let totalCOGS = 0;
    let standardPriceMap: Record<string, number> = {};

    if (costingMode === "standard") {
      const standardCosts = await prisma.standardCostConfig.findMany({
        where: { companyId },
        orderBy: { effectiveFrom: "desc" },
        distinct: ["materialId"],
      });
      for (const sc of standardCosts) {
        standardPriceMap[sc.materialId] = sc.standardPrice;
      }

      const allPurchasesRaw = await prisma.rawMaterialPurchase.findMany({
        where: { companyId },
        select: { quantity: true, materialId: true, totalCost: true }
      });
      allPurchasesRaw.forEach(p => {
        const std = standardPriceMap[p.materialId] ?? (p.quantity > 0 ? p.totalCost / p.quantity : 0);
        totalCOGS += p.quantity * std;
      });
    } else {
      const purchasesResult = await prisma.rawMaterialPurchase.aggregate({
        where: { companyId },
        _sum: { totalCost: true },
      });
      totalCOGS = purchasesResult._sum.totalCost || 0;
    }

    // ── 3. Overhead
    const expensesResult = await prisma.expensePayment.aggregate({
      where: { companyId },
      _sum: { amount: true },
    });
    const totalOverhead = expensesResult._sum.amount || 0;
    const netProfit = totalRevenue - (totalCOGS + totalOverhead);

    // ── 4. Raw Material Price History (for compact chart)
    const allPurchases = await prisma.rawMaterialPurchase.findMany({
      where: { companyId },
      include: { material: { select: { name: true, unit: true } } },
      orderBy: { purchaseDate: "asc" },
    });

    const materialsSet = new Set<string>();
    const historyMap = new Map<string, any>();

    allPurchases.forEach((p) => {
      materialsSet.add(p.material.name);
      const dateStr = p.purchaseDate.toISOString().split("T")[0];
      if (!historyMap.has(dateStr)) historyMap.set(dateStr, { date: dateStr });
      const existing = historyMap.get(dateStr);
      existing[p.material.name] = p.unitPrice;
    });

    const chartData = Array.from(historyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // ── 5. Financials Overview Chart — last 6 months grouped by month
    const sixMonthsAgo = subMonths(new Date(), 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [recentDispatches, recentPurchases, recentPayments] = await Promise.all([
      prisma.dispatchLoadItem.findMany({
        where: {
          dispatchLoad: { companyId, status: "DISPATCHED", updatedAt: { gte: sixMonthsAgo } },
          salePricePerSqft: { not: null },
        },
        include: {
          size: { select: { sqft: true } },
          dispatchLoad: { select: { updatedAt: true } },
        },
      }),
      prisma.rawMaterialPurchase.findMany({
        where: { companyId, purchaseDate: { gte: sixMonthsAgo } },
        select: { purchaseDate: true, totalCost: true, quantity: true, materialId: true },
      }),
      prisma.expensePayment.findMany({
        where: { companyId, paymentDate: { gte: sixMonthsAgo } },
        select: { paymentDate: true, amount: true },
      }),
    ]);

    const overviewMap = new Map<string, { month: string; revenue: number; cogs: number; overhead: number; netProfit: number }>();

    const ensureMonth = (monthKey: string) => {
      if (!overviewMap.has(monthKey)) {
        overviewMap.set(monthKey, { month: monthKey, revenue: 0, cogs: 0, overhead: 0, netProfit: 0 });
      }
      return overviewMap.get(monthKey)!;
    };

    recentDispatches.forEach((item) => {
      const key = format(new Date(item.dispatchLoad.updatedAt), "MMM yy");
      const sqft = (item.size?.sqft || 0) * item.quantity;
      ensureMonth(key).revenue += sqft * (item.salePricePerSqft || 0);
    });

    recentPurchases.forEach((p) => {
      const key = format(new Date(p.purchaseDate), "MMM yy");
      if (costingMode === "standard") {
        const std = standardPriceMap[p.materialId] ?? (p.quantity > 0 ? p.totalCost / p.quantity : 0);
        ensureMonth(key).cogs += p.quantity * std;
      } else {
        ensureMonth(key).cogs += p.totalCost;
      }
    });

    recentPayments.forEach((p) => {
      const key = format(new Date(p.paymentDate), "MMM yy");
      ensureMonth(key).overhead += p.amount;
    });

    // Compute net profit per month and sort
    const financialsOverviewData = Array.from(overviewMap.values())
      .map((d) => ({ ...d, netProfit: d.revenue - d.cogs - d.overhead }))
      .sort((a, b) => {
        const parse = (s: string) => new Date(`01 ${s}`).getTime();
        return parse(a.month) - parse(b.month);
      });

    // ── 6. Expenses History Chart — per expense name, by month
    const expensePayments = await prisma.expensePayment.findMany({
      where: { companyId, paymentDate: { gte: sixMonthsAgo } },
      include: { expense: { select: { name: true } } },
      orderBy: { paymentDate: "asc" },
    });

    const expenseNamesSet = new Set<string>();
    const expenseHistoryMap = new Map<string, any>();

    expensePayments.forEach((p) => {
      const expName = p.expense.name;
      expenseNamesSet.add(expName);
      const key = format(new Date(p.paymentDate), "MMM yy");
      if (!expenseHistoryMap.has(key)) expenseHistoryMap.set(key, { month: key });
      const existing = expenseHistoryMap.get(key);
      existing[expName] = (existing[expName] || 0) + p.amount;
    });

    const expenseChartData = Array.from(expenseHistoryMap.values()).sort((a, b) => {
      const parse = (s: string) => new Date(`01 ${s}`).getTime();
      return parse(a.month) - parse(b.month);
    });

    // ── 7. Face Wastage Calculation
    const faceMaterial = await prisma.rawMaterial.findFirst({
      where: { companyId, isFaceMaterial: true },
    });

    let faceWastage = null;

    if (faceMaterial) {
      const facePurchasesTotal = await prisma.rawMaterialPurchase.aggregate({
        where: { companyId, materialId: faceMaterial.id },
        _sum: { quantity: true },
      });
      const facePurchasedTotal = facePurchasesTotal._sum.quantity || 0;

      // Total sqft ever produced
      const totalProductionSqft = await prisma.pressEntry.aggregate({
        where: { session: { companyId } },
        _sum: { quantity: true },
      });

      // We need sqft, not just sheets — get from press entries with size
      const allPressEntries = await prisma.pressEntry.findMany({
        where: { session: { companyId } },
        include: { size: { select: { sqft: true } } },
      });
      const totalSqft = allPressEntries.reduce((sum, e) => sum + e.quantity * (e.size?.sqft || 0), 0);
      const faceUsedSqM = totalSqft * 2 * SQFT_TO_SQM;

      // Convert purchased quantity to sqm (assume unit is sqmt or sqm already)
      const facePurchasedSqM = facePurchasedTotal;
      const wastagePercent = facePurchasedSqM > 0
        ? Math.max(0, (facePurchasedSqM - faceUsedSqM) / facePurchasedSqM) * 100
        : 0;

      faceWastage = {
        faceMaterialName: faceMaterial.name,
        faceMaterialUnit: faceMaterial.unit,
        faceUsedSqM: parseFloat(faceUsedSqM.toFixed(2)),
        facePurchasedSqM: parseFloat(facePurchasedSqM.toFixed(2)),
        wastagePercent: parseFloat(wastagePercent.toFixed(1)),
      };
    }

    return NextResponse.json({
      revenue: totalRevenue,
      cogs: totalCOGS,
      overhead: totalOverhead,
      netProfit,
      chartData,
      materialNames: Array.from(materialsSet),
      financialsOverviewData,
      expenseChartData,
      expenseNames: Array.from(expenseNamesSet),
      faceWastage,
    });
  } catch (error) {
    console.error("[FINANCIALS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
