import { prisma } from "../src/lib/prisma";
import { startOfWeek, endOfWeek, format } from "date-fns";

async function test() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log("No company found");
      return;
    }
    const companyId = company.id;
    const targetDate = new Date();

    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    console.log("Date Range:", format(weekStart, "yyyy-MM-dd"), "to", format(weekEnd, "yyyy-MM-dd"));

    // 1. Get Production for the week
    const pressEntries = await prisma.pressEntry.findMany({
      where: {
        session: { companyId, status: "STOPPED" },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      include: {
        thickness: true,
        size: true,
      },
    });

    const productionByThickness: Record<string, { sheets: number; sqft: number; name: string }> = {};
    let totalSheetsWeek = 0;
    let totalSqftWeek = 0;

    pressEntries.forEach((entry: any) => {
      const tId = entry.thicknessId;
      if (!productionByThickness[tId]) {
        productionByThickness[tId] = { sheets: 0, sqft: 0, name: entry.thickness.value + entry.thickness.unit };
      }
      productionByThickness[tId].sheets += entry.quantity;
      productionByThickness[tId].sqft += entry.quantity * entry.size.sqft;
      totalSheetsWeek += entry.quantity;
      totalSqftWeek += entry.quantity * entry.size.sqft;
    });

    console.log("Production:", productionByThickness);

    // 2. Get Product Specs
    const specs = await prisma.plywoodProductSpec.findMany({
      where: { companyId },
    });
    const specMap = new Map(specs.map((s: any) => [s.thicknessId, s]));

    console.log("Specs:", specs);

    // 3. Get Latest Purchases for Dynamic Weightage
    const materials = await prisma.rawMaterial.findMany({ where: { companyId } });
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

    function getNormalizationFactors(unit: string) {
      const u = (unit || "").toUpperCase().trim();
      if (u === "TON" || u === "TONS" || u === "MT" || u === "METRIC TON" || u === "METRIC TONS") {
        return { qtyFactor: 1000, priceFactor: 0.001 };
      }
      return { qtyFactor: 1, priceFactor: 1 };
    }

    // Calculate normalized quantities and prices in KG
    const normalizedPurchases = validPurchases.map((p: any) => {
      const { qtyFactor, priceFactor } = getNormalizationFactors(p.material.unit);
      const normalizedQty = (p.purchase?.quantity || 0) * qtyFactor;
      const pricePerKg = (p.purchase?.unitPrice || 0) * priceFactor;
      return {
        ...p,
        normalizedQty,
        pricePerKg,
      };
    });

    const totalRawMaterialQty = normalizedPurchases.reduce((sum: any, p: any) => sum + p.normalizedQty, 0);

    const materialFractions = normalizedPurchases.map((p: any) => ({
      name: p.material.name,
      fraction: totalRawMaterialQty > 0 ? (p.normalizedQty / totalRawMaterialQty) : 0,
      pricePerKg: p.pricePerKg,
      quantity: p.purchase!.quantity,
    }));

    console.log("Material Fractions:", materialFractions);

    // 4. Calculate Material Cost Per Sheet for each thickness
    const materialCostByThickness: Record<string, number> = {};
    Object.keys(productionByThickness).forEach((tId) => {
      const spec = specMap.get(tId);
      if (spec) {
        // Weight is in KG. Price is per KG. So Weight * PricePerKg
        let cost = 0;
        materialFractions.forEach((mf: any) => {
          const weightOfMaterialInKg = spec.weightPerSheetKg * mf.fraction;
          cost += weightOfMaterialInKg * mf.pricePerKg;
        });
        materialCostByThickness[tId] = cost;
      } else {
        materialCostByThickness[tId] = 0; // Missing spec
      }
    });

    console.log("Material Cost by Thickness:", materialCostByThickness);

    // 5. Get Latest Expenses for Overhead Calculation
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
    let totalOverheadCostPerSheet = 0;

    for (const vp of validPayments) {
      // Find total sheets produced since this payment date
      const paymentDate = vp.payment!.paymentDate;
      const sheetsSince = await prisma.pressEntry.aggregate({
        where: {
          session: { companyId },
          createdAt: { gte: paymentDate, lte: weekEnd },
        },
        _sum: { quantity: true },
      });
      const sheetsCount = sheetsSince._sum.quantity || 1; // Avoid div by zero
      totalOverheadCostPerSheet += vp.payment!.amount / sheetsCount;
    }

    console.log("Total Overhead Cost Per Sheet:", totalOverheadCostPerSheet);

    // 6. Get Dispatches to find Sale Price
    const dispatches = await prisma.dispatchLoadItem.findMany({
      where: {
        dispatchLoad: { companyId, status: "DISPATCHED", updatedAt: { gte: weekStart, lte: weekEnd } },
      },
      include: { 
        dispatchLoad: true,
        size: true,
      },
    });

    const revenueByThickness: Record<string, { totalRevenue: number; totalSqft: number }> = {};
    dispatches.forEach((d: any) => {
      const tId = d.thicknessId;
      if (!revenueByThickness[tId]) revenueByThickness[tId] = { totalRevenue: 0, totalSqft: 0 };
      const itemSqft = (d.size?.sqft || 0) * d.quantity;
      revenueByThickness[tId].totalRevenue += (d.salePricePerSqft || 0) * itemSqft;
      revenueByThickness[tId].totalSqft += itemSqft;
    });

    console.log("Revenue by Thickness:", revenueByThickness);

    // 7. Assemble the final report
    const costPerSheetData = Object.keys(productionByThickness).map((tId) => {
      const prod = productionByThickness[tId];
      const matCost = materialCostByThickness[tId] || 0;
      const totalCost = matCost + totalOverheadCostPerSheet;
      const rev = revenueByThickness[tId];
      const avgSalePricePerSqft = rev && rev.totalSqft > 0 ? rev.totalRevenue / rev.totalSqft : 0;
      const totalCostPerSqft = prod.sqft > 0 ? (totalCost * prod.sheets) / prod.sqft : 0;
      const marginPerSqft = avgSalePricePerSqft - totalCostPerSqft;

      return {
        thicknessId: tId,
        name: prod.name,
        sheetsProduced: prod.sheets,
        materialCostPerSheet: matCost,
        overheadCostPerSheet: totalOverheadCostPerSheet,
        totalCostPerSheet: totalCost,
        avgSalePricePerSqft,
        totalCostPerSqft,
        marginPerSqft,
      };
    });

    // Total material cost this week
    let totalMaterialCostThisWeek = 0;
    costPerSheetData.forEach((c) => {
      totalMaterialCostThisWeek += c.materialCostPerSheet * c.sheetsProduced;
    });

    const totalRevenueThisWeek = Object.values(revenueByThickness).reduce((sum, r) => sum + r.totalRevenue, 0);

    const result = {
      weekLabel: `Week of ${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`,
      summary: {
        totalSheets: totalSheetsWeek,
        totalSqft: totalSqftWeek,
        totalMaterialCost: totalMaterialCostThisWeek,
        totalRevenue: totalRevenueThisWeek,
        netProfit: totalRevenueThisWeek - (totalMaterialCostThisWeek + (totalOverheadCostPerSheet * totalSheetsWeek)),
      },
      materialFractions,
      overheadDetails: validPayments.map((p: any) => ({ name: p.expense.name, amount: p.payment!.amount })),
      costPerSheetData,
    };

    console.log("Result:", JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("Error in test script:", err);
  }
}

test();
