import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownedCompanies = (session.user as any).ownedCompanies || [];
    if (ownedCompanies.length === 0) {
      return NextResponse.json({ overall: null, companies: [] });
    }

    const companyIds = ownedCompanies.map((c: any) => c.id);

    const companyStatsPromises = companyIds.map(async (companyId: string) => {
      const [
        totalBatches,
        totalInventory,
        totalUsers,
        totalOrders
      ] = await Promise.all([
        prisma.productionBatch.count({ where: { companyId } }),
        prisma.inventoryItem.aggregate({
          where: { companyId },
          _sum: { quantity: true },
        }),
        prisma.user.count({ where: { companyId } }),
        prisma.order.count({ where: { companyId } })
      ]);

      const company = ownedCompanies.find((c: any) => c.id === companyId);
      return {
        id: companyId,
        name: company.name,
        totalBatches,
        totalStock: totalInventory._sum.quantity || 0,
        totalUsers,
        totalOrders,
      };
    });

    const companyStats = await Promise.all(companyStatsPromises);

    const overall = companyStats.reduce((acc, curr) => ({
      totalBatches: acc.totalBatches + curr.totalBatches,
      totalStock: acc.totalStock + curr.totalStock,
      totalUsers: acc.totalUsers + curr.totalUsers,
      totalOrders: acc.totalOrders + curr.totalOrders,
    }), { totalBatches: 0, totalStock: 0, totalUsers: 0, totalOrders: 0 });

    return NextResponse.json({ overall, companies: companyStats });
  } catch (error: any) {
    console.error("Overall stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
