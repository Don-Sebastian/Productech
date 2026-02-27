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
    const companyId = (session.user as any).companyId;

    if (role === "ADMIN") {
      // Admin stats: total companies, total users, etc.
      const [totalCompanies, totalUsers, totalOwners] = await Promise.all([
        prisma.company.count(),
        prisma.user.count(),
        prisma.user.count({ where: { role: "OWNER" } }),
      ]);

      return NextResponse.json({
        role: "ADMIN",
        stats: {
          totalCompanies,
          totalUsers,
          totalOwners,
        },
      });
    }

    if (!companyId) {
      return NextResponse.json({ error: "No company" }, { status: 400 });
    }

    if (role === "OWNER" || role === "MANAGER") {
      const [
        totalBatches,
        completedBatches,
        inProgressBatches,
        totalInventory,
        totalUsers,
        totalManagers,
        totalSupervisors,
        totalOperators,
        recentBatches,
      ] = await Promise.all([
        prisma.productionBatch.count({ where: { companyId } }),
        prisma.productionBatch.count({ where: { companyId, status: "COMPLETED" } }),
        prisma.productionBatch.count({ where: { companyId, status: "IN_PROGRESS" } }),
        prisma.inventoryItem.aggregate({
          where: { companyId },
          _sum: { quantity: true },
        }),
        prisma.user.count({ where: { companyId } }),
        prisma.user.count({ where: { companyId, role: "MANAGER" } }),
        prisma.user.count({ where: { companyId, role: "SUPERVISOR" } }),
        prisma.user.count({ where: { companyId, role: "OPERATOR" } }),
        prisma.productionBatch.findMany({
          where: { companyId },
          include: {
            productType: { select: { name: true } },
            assignedTo: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      return NextResponse.json({
        role,
        stats: {
          totalBatches,
          completedBatches,
          inProgressBatches,
          totalStock: totalInventory._sum.quantity || 0,
          totalUsers,
          totalManagers,
          totalSupervisors,
          totalOperators,
        },
        recentBatches,
      });
    }

    if (role === "SUPERVISOR") {
      const section = (session.user as any).section;
      const batchWhere: any = { companyId };
      if (section) batchWhere.section = section;

      const [totalBatches, completedBatches, inProgressBatches] = await Promise.all([
        prisma.productionBatch.count({ where: batchWhere }),
        prisma.productionBatch.count({ where: { ...batchWhere, status: "COMPLETED" } }),
        prisma.productionBatch.count({ where: { ...batchWhere, status: "IN_PROGRESS" } }),
      ]);

      return NextResponse.json({
        role,
        section,
        stats: {
          totalBatches,
          completedBatches,
          inProgressBatches,
        },
      });
    }

    if (role === "OPERATOR") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayLogs, totalLogs] = await Promise.all([
        prisma.machineLog.count({
          where: {
            operatorId: session.user.id,
            shiftDate: today,
          },
        }),
        prisma.machineLog.count({
          where: { operatorId: session.user.id },
        }),
      ]);

      return NextResponse.json({
        role,
        stats: {
          todayLogs,
          totalLogs,
        },
      });
    }

    return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
