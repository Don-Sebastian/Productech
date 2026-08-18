import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfWeek, endOfWeek, format } from "date-fns";

const SQFT_TO_SQM = 0.0929;

function getNormalizationFactors(unit: string) {
  const u = (unit || "").toUpperCase().trim();
  if (u === "TON" || u === "TONS" || u === "MT" || u === "METRIC TON" || u === "METRIC TONS") {
    return { qtyFactor: 1000, priceFactor: 0.001 };
  }
  return { qtyFactor: 1, priceFactor: 1 };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const companyId = session.user.companyId;

    // ─── 1. Production for the week ───────────────────────────────────────────
    const pressEntries = await prisma.pressEntry.findMany({
      where: {
        session: { companyId, status: "STOPPED" },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      include: { category: true, thickness: true, size: true },
    });

    const productionByThickness: Record<string, { sheets: number; sqft: number; name: string; categoryId?: string }> = {};
    let totalSheetsWeek = 0;
    let totalSqftWeek = 0;

    pressEntries.forEach((entry: any) => {
      const tId = entry.thicknessId;
      if (!productionByThickness[tId]) {
        productionByThickness[tId] = {
          sheets: 0,
          sqft: 0,
          name: entry.thickness.value + entry.thickness.unit,
          categoryId: entry.categoryId,
        };
      }
      productionByThickness[tId].sheets += entry.quantity;
      productionByThickness[tId].sqft += entry.quantity * (entry.size?.sqft || 0);
      totalSheetsWeek += entry.quantity;
      totalSqftWeek += entry.quantity * (entry.size?.sqft || 0);
    });

    // ─── 2. Product Specs & BOM ───────────────────────────────────────────────
    const specs = await prisma.plywoodProductSpec.findMany({
      where: { companyId },
      include: { bomItems: { include: { material: true } } },
    });
    const specMap = new Map(specs.map((s: any) => [`${s.categoryId}-${s.thicknessId}`, s]));
    const specByThicknessFallback = new Map(specs.map((s: any) => [s.thicknessId, s]));

    // ─── 3. Raw Materials ─────────────────────────────────────────────────────
    const materials = await prisma.rawMaterial.findMany({
      where: { companyId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // ─── 4. Standard Cost Configs ─────────────────────────────────────────────
    const standardCosts = await prisma.standardCostConfig.findMany({
      where: { companyId },
      orderBy: { effectiveFrom: "desc" },
      distinct: ["materialId"],
    });
    const standardPriceMap: Record<string, number> = {};
    for (const sc of standardCosts) {
      const mat = materials.find((m: any) => m.id === sc.materialId);
      if (mat) {
        const { priceFactor } = getNormalizationFactors(mat.unit);
        standardPriceMap[sc.materialId] = sc.standardPrice * priceFactor;
      }
    }

    // ─── 5. Latest purchase (for per-sheet material fraction estimate) ─────────
    const latestPurchases = await Promise.all(
      materials.map(async (mat: any) => {
        const purchase = await prisma.rawMaterialPurchase.findFirst({
          where: { companyId, materialId: mat.id, purchaseDate: { lte: weekEnd } },
          orderBy: { purchaseDate: "desc" },
        });
        return { material: mat, purchase };
      })
    );

    const validPurchases = latestPurchases.filter((p: any) => p.purchase != null);
    const normalizedPurchases = validPurchases.map((p: any) => {
      const { qtyFactor, priceFactor } = getNormalizationFactors(p.material.unit);
      return {
        ...p,
        normalizedQty: (p.purchase?.quantity || 0) * qtyFactor,
        pricePerKg: (p.purchase?.unitPrice || 0) * priceFactor,
      };
    });

    const totalRawMaterialQty = normalizedPurchases.reduce((sum: any, p: any) => sum + p.normalizedQty, 0);
    const materialFractions = normalizedPurchases.map((p: any) => ({
      name: p.material.name,
      category: p.material.category,
      fraction: totalRawMaterialQty > 0 ? p.normalizedQty / totalRawMaterialQty : 0,
      pricePerKg: p.pricePerKg,
      quantity: p.purchase!.quantity,
    }));

    // ─── 6. ACTUAL Weekly Purchases (for this week specifically) ──────────────
    const weeklyPurchases = await prisma.rawMaterialPurchase.findMany({
      where: { companyId, purchaseDate: { gte: weekStart, lte: weekEnd } },
      include: { material: true },
    });

    // Group actual weekly purchases by category and material
    const actualByCategoryMap: Record<string, { spend: number; qty: number; unit: string; materialCount: number }> = {};
    const actualByMaterialMap: Record<string, { name: string; category: string; qty: number; unit: string; unitPrice: number; spend: number }> = {};

    let totalActualMaterialCostWeek = 0;

    weeklyPurchases.forEach((p: any) => {
      const cat = p.material.category || "Others";
      if (!actualByCategoryMap[cat]) {
        actualByCategoryMap[cat] = { spend: 0, qty: 0, unit: p.material.unit, materialCount: 0 };
      }
      actualByCategoryMap[cat].spend += p.totalCost;
      actualByCategoryMap[cat].qty += p.quantity;
      actualByCategoryMap[cat].materialCount += 1;
      totalActualMaterialCostWeek += p.totalCost;

      if (!actualByMaterialMap[p.materialId]) {
        actualByMaterialMap[p.materialId] = {
          name: p.material.name,
          category: cat,
          qty: 0,
          unit: p.material.unit,
          unitPrice: p.unitPrice,
          spend: 0,
        };
      }
      actualByMaterialMap[p.materialId].qty += p.quantity;
      actualByMaterialMap[p.materialId].spend += p.totalCost;
      actualByMaterialMap[p.materialId].unitPrice = p.unitPrice;
    });

    const actualWeeklyCost = {
      totalActualMaterialCost: totalActualMaterialCostWeek,
      byCategory: Object.entries(actualByCategoryMap).map(([category, data]) => ({
        category,
        spend: data.spend,
        qty: data.qty,
        unit: data.unit,
        materialCount: data.materialCount,
      })).sort((a, b) => b.spend - a.spend),
      byMaterial: Object.values(actualByMaterialMap).sort((a, b) => b.spend - a.spend),
    };

    // ─── 7. Standard BOM Cost per Thickness ───────────────────────────────────
    const standardMatCostByThickness: Record<string, { matCost: number; kgPerSheet: number }> = {};
    Object.keys(productionByThickness).forEach((tId) => {
      const prod = productionByThickness[tId];
      const spec = (prod.categoryId ? specMap.get(`${prod.categoryId}-${tId}`) : null) || specByThicknessFallback.get(tId);
      if (spec && spec.bomItems?.length > 0) {
        // Calculate from BOM items with standard rates
        let stdCost = 0;
        let totalKg = 0;
        spec.bomItems.forEach((item: any) => {
          const rate = standardPriceMap[item.materialId] || item.material?.currentRate || 0;
          stdCost += item.quantity * rate;
          totalKg += item.quantity;
        });
        standardMatCostByThickness[tId] = { matCost: stdCost, kgPerSheet: totalKg };
      } else {
        // Fallback to fraction-based
        let cost = 0;
        let totalKg = 0;
        if (spec) {
          materialFractions.forEach((mf: any) => {
            const matId = materials.find((m: any) => m.name === mf.name)?.id;
            const rate = (matId && standardPriceMap[matId]) || mf.pricePerKg;
            cost += (spec.weightPerSheetKg || 0) * mf.fraction * rate;
            totalKg += (spec.weightPerSheetKg || 0) * mf.fraction;
          });
        }
        standardMatCostByThickness[tId] = { matCost: cost, kgPerSheet: totalKg };
      }
    });

    // ─── 8. Actual Material Cost per Thickness ────────────────────────────────
    // Distribute actual weekly material spend across thicknesses by production volume ratio
    const totalStandardMatCost = Object.keys(productionByThickness).reduce((sum, tId) => {
      return sum + (standardMatCostByThickness[tId]?.matCost || 0) * productionByThickness[tId].sheets;
    }, 0);

    // ─── 9. Overhead ──────────────────────────────────────────────────────────
    const budget = await prisma.budgetConfig.findFirst({
      where: { companyId },
      orderBy: { effectiveFrom: "desc" },
    });
    const standardOverheadCostPerSheet = budget?.budgetedMonthlySheets && budget.budgetedMonthlySheets > 0
      ? budget.budgetedMonthlyOverhead / budget.budgetedMonthlySheets
      : 0;

    // Actual overhead: payments made in this week
    const weeklyExpensePayments = await prisma.expensePayment.findMany({
      where: { companyId, paymentDate: { gte: weekStart, lte: weekEnd } },
      include: { expense: true },
    });
    const totalActualOverheadWeek = weeklyExpensePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const actualOverheadPerSheet = totalSheetsWeek > 0 ? totalActualOverheadWeek / totalSheetsWeek : 0;

    // Also keep the legacy overhead method for legacy display
    const expenses = await prisma.expense.findMany({ where: { companyId } });
    const latestExpensePayments = await Promise.all(
      expenses.map(async (exp: any) => {
        const payment = await prisma.expensePayment.findFirst({
          where: { companyId, expenseId: exp.id, paymentDate: { lte: weekEnd } },
          orderBy: { paymentDate: "desc" },
        });
        return { expense: exp, payment };
      })
    );
    const validPayments = latestExpensePayments.filter((p: any) => p.payment != null);
    let totalLegacyOverheadPerSheet = 0;
    for (const vp of validPayments) {
      const sheetsSince = await prisma.pressEntry.aggregate({
        where: { session: { companyId }, createdAt: { gte: vp.payment!.paymentDate, lte: weekEnd } },
        _sum: { quantity: true },
      });
      const sheetsCount = sheetsSince._sum.quantity || 1;
      totalLegacyOverheadPerSheet += vp.payment!.amount / sheetsCount;
    }

    // ─── 10. Revenue from dispatches ──────────────────────────────────────────
    const dispatches = await prisma.dispatchLoadItem.findMany({
      where: { dispatchLoad: { companyId, status: "DISPATCHED", updatedAt: { gte: weekStart, lte: weekEnd } } },
      include: { dispatchLoad: true, size: true },
    });

    const revenueByThickness: Record<string, { totalRevenue: number; totalSqft: number }> = {};
    dispatches.forEach((d: any) => {
      const tId = d.thicknessId;
      if (!revenueByThickness[tId]) revenueByThickness[tId] = { totalRevenue: 0, totalSqft: 0 };
      const itemSqft = (d.size?.sqft || 0) * d.quantity;
      revenueByThickness[tId].totalRevenue += (d.salePricePerSqft || 0) * itemSqft;
      revenueByThickness[tId].totalSqft += itemSqft;
    });

    const totalRevenueThisWeek = Object.values(revenueByThickness).reduce((sum, r) => sum + r.totalRevenue, 0);

    // ─── 11. Cost Per Sheet Data (existing Standard cost breakdown) ───────────
    const materialCostByThickness: Record<string, number> = {};
    Object.keys(productionByThickness).forEach((tId) => {
      const prod = productionByThickness[tId];
      const spec = (prod.categoryId ? specMap.get(`${prod.categoryId}-${tId}`) : null) || specByThicknessFallback.get(tId);
      if (spec) {
        let cost = 0;
        materialFractions.forEach((mf: any) => {
          cost += (spec.weightPerSheetKg || 0) * mf.fraction * mf.pricePerKg;
        });
        materialCostByThickness[tId] = cost;
      } else {
        materialCostByThickness[tId] = 0;
      }
    });

    const costPerSheetData = Object.keys(productionByThickness).map((tId) => {
      const prod = productionByThickness[tId];
      const spec = (prod.categoryId ? specMap.get(`${prod.categoryId}-${tId}`) : null) || specByThicknessFallback.get(tId);

      const matCost = materialCostByThickness[tId] || 0;
      const totalCost = matCost + totalLegacyOverheadPerSheet;
      const rev = revenueByThickness[tId];
      const avgSalePricePerSqft = rev && rev.totalSqft > 0 ? rev.totalRevenue / rev.totalSqft : 0;
      const totalCostPerSqft = prod.sqft > 0 ? (totalCost * prod.sheets) / prod.sqft : 0;

      const stdData = standardMatCostByThickness[tId] || { matCost: 0, kgPerSheet: 0 };
      const standardTotalCost = stdData.matCost + standardOverheadCostPerSheet;
      const standardCostPerSqft = prod.sqft > 0 ? (standardTotalCost * prod.sheets) / prod.sqft : 0;

      // Actual cost per sheet (from weekly purchases, distributed by standard cost ratio)
      const shareOfStandardCost = totalStandardMatCost > 0
        ? (stdData.matCost * prod.sheets) / totalStandardMatCost
        : (totalSheetsWeek > 0 ? prod.sheets / totalSheetsWeek : 0);
      const actualMatCostPerSheet = prod.sheets > 0
        ? (totalActualMaterialCostWeek * shareOfStandardCost) / prod.sheets
        : 0;
      const actualTotalCostPerSheet = actualMatCostPerSheet + actualOverheadPerSheet;
      const actualCostPerSqft = prod.sqft > 0 ? (actualTotalCostPerSheet * prod.sheets) / prod.sqft : 0;

      return {
        thicknessId: tId,
        name: prod.name,
        sheetsProduced: prod.sheets,
        sqftProduced: prod.sqft,
        // Legacy actual (fraction-based)
        materialCostPerSheet: matCost,
        overheadCostPerSheet: totalLegacyOverheadPerSheet,
        totalCostPerSheet: totalCost,
        avgSalePricePerSqft,
        totalCostPerSqft,
        marginPerSqft: avgSalePricePerSqft - totalCostPerSqft,
        // Standard (BOM-based)
        standardMaterialCostPerSheet: stdData.matCost,
        standardKgPerSheet: stdData.kgPerSheet,
        standardOverheadCostPerSheet,
        standardTotalCostPerSheet: standardTotalCost,
        standardCostPerSqft,
        standardMarginPerSqft: avgSalePricePerSqft - standardCostPerSqft,
        // Actual (purchase-based this week)
        actualMaterialCostPerSheet: actualMatCostPerSheet,
        actualOverheadCostPerSheet: actualOverheadPerSheet,
        actualTotalCostPerSheet: actualTotalCostPerSheet,
        actualCostPerSqft,
        actualMarginPerSqft: avgSalePricePerSqft - actualCostPerSqft,
        // Variance (Actual − Standard) — positive = over-budget (adverse)
        matVariancePerSheet: actualMatCostPerSheet - stdData.matCost,
        overheadVariancePerSheet: actualOverheadPerSheet - standardOverheadCostPerSheet,
        totalVariancePerSheet: actualTotalCostPerSheet - standardTotalCost,
        totalVarianceWeek: (actualTotalCostPerSheet - standardTotalCost) * prod.sheets,
      };
    });

    // ─── 12. Yield / Recovery Analysis ────────────────────────────────────────
    // Per category: compare actual purchase qty (this week) vs BOM standard qty (for sheets produced)
    const standardQtyByCategoryMap: Record<string, { stdQty: number; unit: string }> = {};

    Object.keys(productionByThickness).forEach((tId) => {
      const prod = productionByThickness[tId];
      const spec = (prod.categoryId ? specMap.get(`${prod.categoryId}-${tId}`) : null) || specByThicknessFallback.get(tId);
      if (!spec || !spec.bomItems) return;

      spec.bomItems.forEach((item: any) => {
        const cat = item.material?.category || "Others";
        const scaledQty = item.quantity * prod.sheets; // standard qty for sheets produced
        if (!standardQtyByCategoryMap[cat]) {
          standardQtyByCategoryMap[cat] = { stdQty: 0, unit: item.material?.unit || "" };
        }
        standardQtyByCategoryMap[cat].stdQty += scaledQty;
      });
    });

    const yieldByCategory = Object.entries(actualByCategoryMap).map(([category, actual]) => {
      const std = standardQtyByCategoryMap[category];
      const stdQty = std?.stdQty || 0;
      const actualQty = actual.qty;
      const varianceQty = actualQty - stdQty;
      const variancePct = stdQty > 0 ? (varianceQty / stdQty) * 100 : null;
      const perSheet = totalSheetsWeek > 0 ? actualQty / totalSheetsWeek : 0;
      const stdPerSheet = totalSheetsWeek > 0 ? stdQty / totalSheetsWeek : 0;

      return {
        category,
        actualQty,
        stdQty,
        unit: actual.unit,
        actualQtyPerSheet: perSheet,
        stdQtyPerSheet: stdPerSheet,
        varianceQty,
        variancePct,
        actualSpend: actual.spend,
      };
    }).sort((a, b) => b.actualSpend - a.actualSpend);

    // ─── 13. Summary P&L ──────────────────────────────────────────────────────
    let totalStandardCostThisWeek = 0;
    let totalActualCostThisWeek = 0;
    costPerSheetData.forEach((c) => {
      totalStandardCostThisWeek += c.standardTotalCostPerSheet * c.sheetsProduced;
      totalActualCostThisWeek += c.actualTotalCostPerSheet * c.sheetsProduced;
    });

    const pnlSummary = {
      revenue: totalRevenueThisWeek,
      standardCostTotal: totalStandardCostThisWeek,
      actualCostTotal: totalActualCostThisWeek,
      varianceTotal: totalActualCostThisWeek - totalStandardCostThisWeek,
      standardProfit: totalRevenueThisWeek - totalStandardCostThisWeek,
      actualProfit: totalRevenueThisWeek - totalActualCostThisWeek,
      profitImpact: (totalRevenueThisWeek - totalActualCostThisWeek) - (totalRevenueThisWeek - totalStandardCostThisWeek),
    };

    // ─── 14. Face Usage (legacy) ──────────────────────────────────────────────
    const faceMaterial = await prisma.rawMaterial.findFirst({ where: { companyId, isFaceMaterial: true } });
    let faceData = null;
    if (faceMaterial) {
      const latestFacePurchase = await prisma.rawMaterialPurchase.findFirst({
        where: { companyId, materialId: faceMaterial.id, purchaseDate: { lte: weekEnd } },
        orderBy: { purchaseDate: "desc" },
      });
      const facePurchasedAll = await prisma.rawMaterialPurchase.aggregate({
        where: { companyId, materialId: faceMaterial.id, purchaseDate: { lte: weekEnd } },
        _sum: { quantity: true },
      });
      const allPressForFace = await prisma.pressEntry.findMany({
        where: { session: { companyId }, createdAt: { lte: weekEnd } },
        include: { size: { select: { sqft: true } } },
      });
      const totalAllTimeSqft = allPressForFace.reduce((sum, e) => sum + e.quantity * (e.size?.sqft || 0), 0);
      const faceUsedSqMWeek = totalSqftWeek * 2 * SQFT_TO_SQM;
      const faceUsedSqMAllTime = totalAllTimeSqft * 2 * SQFT_TO_SQM;
      const facePurchasedSqM = facePurchasedAll._sum.quantity || 0;
      const wastagePercent = facePurchasedSqM > 0
        ? Math.max(0, (facePurchasedSqM - faceUsedSqMAllTime) / facePurchasedSqM) * 100
        : 0;
      faceData = {
        faceMaterialName: faceMaterial.name,
        faceMaterialUnit: faceMaterial.unit,
        faceUsedSqMWeek: parseFloat(faceUsedSqMWeek.toFixed(2)),
        faceUsedSqMAllTime: parseFloat(faceUsedSqMAllTime.toFixed(2)),
        facePurchasedSqM: parseFloat(facePurchasedSqM.toFixed(2)),
        wastagePercent: parseFloat(wastagePercent.toFixed(1)),
        latestPurchaseDate: latestFacePurchase?.purchaseDate || null,
      };
    }

    // ─── Summary block (legacy compatible) ────────────────────────────────────
    const totalMaterialCostThisWeek = costPerSheetData.reduce((s, c) => s + c.materialCostPerSheet * c.sheetsProduced, 0);
    const totalStandardMaterialCostThisWeek = costPerSheetData.reduce((s, c) => s + c.standardMaterialCostPerSheet * c.sheetsProduced, 0);
    const legacyActualCost = totalMaterialCostThisWeek + (totalLegacyOverheadPerSheet * totalSheetsWeek);
    const legacyStandardCost = totalStandardMaterialCostThisWeek + (standardOverheadCostPerSheet * totalSheetsWeek);

    return NextResponse.json({
      weekLabel: `Week of ${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      summary: {
        totalSheets: totalSheetsWeek,
        totalSqft: totalSqftWeek,
        totalSqM: parseFloat((totalSqftWeek * SQFT_TO_SQM).toFixed(2)),
        totalFaceUsedSqM: parseFloat((totalSqftWeek * 2 * SQFT_TO_SQM).toFixed(2)),
        totalMaterialCost: totalMaterialCostThisWeek,
        totalStandardMaterialCost: totalStandardMaterialCostThisWeek,
        totalActualCost: legacyActualCost,
        totalStandardCost: legacyStandardCost,
        standardOverheadCostPerSheet,
        totalRevenue: totalRevenueThisWeek,
        netProfit: totalRevenueThisWeek - legacyActualCost,
        standardNetProfit: totalRevenueThisWeek - legacyStandardCost,
        // Actual (purchase-based) totals
        actualWeeklyMaterialCost: totalActualMaterialCostWeek,
        actualWeeklyOverhead: totalActualOverheadWeek,
        actualOverheadPerSheet,
        actualTotalCost: totalActualCostThisWeek,
        actualNetProfit: totalRevenueThisWeek - totalActualCostThisWeek,
      },
      materialFractions,
      overheadDetails: validPayments.map((p: any) => ({ name: p.expense.name, amount: p.payment!.amount })),
      costPerSheetData,
      faceData,
      // Phase 3 & 4 new fields
      actualWeeklyCost,
      yieldAnalysis: {
        totalSheetsProduced: totalSheetsWeek,
        totalSqftProduced: totalSqftWeek,
        byCategory: yieldByCategory,
      },
      pnlSummary,
    });
  } catch (error) {
    console.error("Error calculating cost analysis:", error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}
