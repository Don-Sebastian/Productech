import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const role = (session.user as any).role;
    if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 1. Calculate Revenue (From DispatchLoadItems that have a salePricePerSqft and belong to a DISPATCHED load)
    const dispatches = await prisma.dispatchLoadItem.findMany({
      where: {
        dispatchLoad: { companyId, status: "DISPATCHED" },
        salePricePerSqft: { not: null }
      },
      include: {
        size: { select: { sqft: true } }
      }
    });

    let totalRevenue = 0;
    dispatches.forEach(item => {
      const sqft = (item.size?.sqft || 0) * item.quantity;
      totalRevenue += sqft * (item.salePricePerSqft || 0);
    });

    // 2. Calculate COGS (Cost of Goods Sold - Raw Material Purchases)
    const purchasesResult = await prisma.rawMaterialPurchase.aggregate({
      where: { companyId },
      _sum: { totalCost: true }
    });
    const totalCOGS = purchasesResult._sum.totalCost || 0;

    // 3. Calculate Overhead (Expense Payments)
    const expensesResult = await prisma.expensePayment.aggregate({
      where: { companyId },
      _sum: { amount: true }
    });
    const totalOverhead = expensesResult._sum.amount || 0;

    const netProfit = totalRevenue - (totalCOGS + totalOverhead);

    // 4. Raw Material Price History for Chart
    const purchases = await prisma.rawMaterialPurchase.findMany({
      where: { companyId },
      include: { material: { select: { name: true, unit: true } } },
      orderBy: { purchaseDate: 'asc' }
    });

    const priceHistory: Record<string, { date: string; [materialName: string]: any }[]> = {};
    const materialsSet = new Set<string>();

    // We'll format this for recharts
    // e.g. [{ date: 'Jan 10', WOOD: 50, GUM: 120 }, { date: 'Jan 15', WOOD: 55 }]
    const historyMap = new Map<string, any>();

    purchases.forEach(p => {
      materialsSet.add(p.material.name);
      const dateStr = p.purchaseDate.toISOString().split('T')[0];
      if (!historyMap.has(dateStr)) {
        historyMap.set(dateStr, { date: dateStr });
      }
      const existing = historyMap.get(dateStr);
      existing[p.material.name] = p.unitPrice;
    });

    const chartData = Array.from(historyMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      revenue: totalRevenue,
      cogs: totalCOGS,
      overhead: totalOverhead,
      netProfit,
      chartData,
      materialNames: Array.from(materialsSet)
    });

  } catch (error) {
    console.error("[FINANCIALS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
