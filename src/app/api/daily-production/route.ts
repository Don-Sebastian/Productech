import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch daily production logs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { companyId };

    // Operators see only their own logs
    if (role === "OPERATOR") {
      where.operatorId = userId;
    }

    // Filter by status if specified
    if (status) {
      where.status = status;
    }

    // Supervisors see SUBMITTED logs for approval
    if (role === "SUPERVISOR" && !status) {
      where.status = { in: ["SUBMITTED", "SUPERVISOR_APPROVED", "MANAGER_APPROVED"] };
    }

    // Managers see SUPERVISOR_APPROVED logs for their approval
    if (role === "MANAGER" && !status) {
      where.status = { in: ["SUPERVISOR_APPROVED", "MANAGER_APPROVED"] };
    }

    const logs = await prisma.dailyProductionLog.findMany({
      where,
      include: {
        operator: { select: { name: true, section: true } },
        supervisorApprovedBy: { select: { name: true } },
        managerApprovedBy: { select: { name: true } },
        entries: {
          include: {
            product: {
              include: {
                category: { select: { name: true } },
                thickness: { select: { value: true } },
                size: { select: { label: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - Submit daily production for approval (Operator)
// Or approve (Supervisor / Manager)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    const body = await request.json();
    const { action, logId, notes } = body;

    // ============ OPERATOR: Submit daily production ============
    if (action === "submit" && role === "OPERATOR") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);

      // Get today's unlinked entries
      const entries = await prisma.productionEntry.findMany({
        where: {
          operatorId: userId,
          dailyLogId: null,
          createdAt: { gte: today, lt: endDate },
        },
      });

      if (entries.length === 0) {
        return NextResponse.json({ error: "No production entries to submit" }, { status: 400 });
      }

      // Create or update daily log
      let dailyLog = await prisma.dailyProductionLog.findFirst({
        where: { companyId, operatorId: userId, date: today },
      });

      if (dailyLog) {
        // If rejected, allow re-submit
        if (dailyLog.status !== "PENDING" && dailyLog.status !== "REJECTED") {
          return NextResponse.json({ error: "Already submitted" }, { status: 400 });
        }
        dailyLog = await prisma.dailyProductionLog.update({
          where: { id: dailyLog.id },
          data: { status: "SUBMITTED", notes: notes || null },
        });
      } else {
        dailyLog = await prisma.dailyProductionLog.create({
          data: {
            date: today,
            status: "SUBMITTED",
            notes: notes || null,
            companyId,
            operatorId: userId,
          },
        });
      }

      // Link all entries to this daily log
      await prisma.productionEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { dailyLogId: dailyLog.id },
      });

      // Notify supervisor
      await prisma.notification.create({
        data: {
          type: "PRODUCTION_SUBMITTED",
          title: "📋 Production Submitted",
          message: `Press operator submitted ${entries.length} production entries for today. Review and approve.`,
          priority: "HIGH",
          targetRole: "SUPERVISOR",
          companyId,
        },
      });

      return NextResponse.json(dailyLog, { status: 201 });
    }

    // ============ SUPERVISOR: Approve daily production ============
    if (action === "supervisor_approve" && role === "SUPERVISOR") {
      if (!logId) return NextResponse.json({ error: "Log ID required" }, { status: 400 });

      const log = await prisma.dailyProductionLog.findUnique({ where: { id: logId } });
      if (!log || log.status !== "SUBMITTED") {
        return NextResponse.json({ error: "Log not found or not in submitted state" }, { status: 400 });
      }

      const updated = await prisma.dailyProductionLog.update({
        where: { id: logId },
        data: {
          status: "SUPERVISOR_APPROVED",
          supervisorApprovedById: userId,
          supervisorApprovedAt: new Date(),
          supervisorNotes: notes || null,
        },
      });

      // Notify manager
      await prisma.notification.create({
        data: {
          type: "PRODUCTION_SUPERVISOR_APPROVED",
          title: "✅ Production Approved by Supervisor",
          message: `Daily production log has been approved by supervisor. Please review and give final approval.`,
          priority: "HIGH",
          targetRole: "MANAGER",
          companyId,
        },
      });

      return NextResponse.json(updated);
    }

    // ============ MANAGER: Final approval → update stock ============
    if (action === "manager_approve" && (role === "MANAGER" || role === "OWNER")) {
      if (!logId) return NextResponse.json({ error: "Log ID required" }, { status: 400 });

      const log = await prisma.dailyProductionLog.findUnique({
        where: { id: logId },
        include: { entries: true },
      });

      if (!log || log.status !== "SUPERVISOR_APPROVED") {
        return NextResponse.json({ error: "Log not ready for manager approval" }, { status: 400 });
      }

      // Update stock for each entry
      for (const entry of log.entries) {
        await prisma.companyProduct.update({
          where: { id: entry.productId },
          data: { currentStock: { increment: entry.quantity } },
        });
      }

      const updated = await prisma.dailyProductionLog.update({
        where: { id: logId },
        data: {
          status: "MANAGER_APPROVED",
          managerApprovedById: userId,
          managerApprovedAt: new Date(),
          managerNotes: notes || null,
        },
      });

      // Notify operator
      await prisma.notification.create({
        data: {
          type: "PRODUCTION_APPROVED",
          title: "✅ Production Added to Stock",
          message: `Your daily production has been approved and added to inventory.`,
          priority: "NORMAL",
          targetRole: "OPERATOR",
          companyId,
        },
      });

      return NextResponse.json(updated);
    }

    // ============ REJECT (Supervisor or Manager) ============
    if (action === "reject" && (role === "SUPERVISOR" || role === "MANAGER" || role === "OWNER")) {
      if (!logId) return NextResponse.json({ error: "Log ID required" }, { status: 400 });

      const updated = await prisma.dailyProductionLog.update({
        where: { id: logId },
        data: {
          status: "REJECTED",
          ...(role === "SUPERVISOR"
            ? { supervisorNotes: notes || "Rejected by supervisor" }
            : { managerNotes: notes || "Rejected by manager" }),
        },
      });

      // Notify operator
      await prisma.notification.create({
        data: {
          type: "PRODUCTION_REJECTED",
          title: "❌ Production Rejected",
          message: `Your daily production was rejected. Reason: ${notes || "No reason provided"}. You can re-submit.`,
          priority: "HIGH",
          targetRole: "OPERATOR",
          companyId,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
