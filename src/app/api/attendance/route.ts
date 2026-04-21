import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch attendance registers (with filters by date, shift, supervisor, status)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const shiftId = searchParams.get("shiftId");
    const status = searchParams.get("status");
    const supervisorId = searchParams.get("supervisorId");
    const machineId = searchParams.get("machineId");

    const where: any = { companyId };
    // Support single date or date range
    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      where.date = { gte: start, lt: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const ed = new Date(endDate);
        where.date.lte = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 23, 59, 59);
      }
    }
    if (shiftId) where.shiftId = shiftId;
    if (status) where.status = status;
    if (machineId) where.shift = { machineId };
    // Supervisors can only see their own registers
    if (role === "SUPERVISOR") where.supervisorId = userId;
    else if (supervisorId) where.supervisorId = supervisorId;

    const registers = await prisma.attendanceRegister.findMany({
      where,
      include: {
        shift: { select: { id: true, name: true, startTime: true, endTime: true, machineId: true, machine: { select: { id: true, name: true } } } },
        supervisor: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        entries: {
          include: {
            employee: {
              select: {
                id: true, name: true, phone: true, photoData: true,
                wageAmount: true, wageType: true,
                subDepartment: { select: { id: true, name: true } },
                machine: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(registers);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

// POST: Create/update register, or submit/approve/reject
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const body = await request.json();
    const { action } = body;

    // Action: Save or update attendance entries for a shift
    if (action === "save" || !action) {
      if (!["SUPERVISOR"].includes(role)) return NextResponse.json({ error: "Only supervisors can mark attendance" }, { status: 403 });

      const { shiftId, date, entries } = body;
      if (!shiftId || !date || !entries) return NextResponse.json({ error: "shiftId, date, and entries required" }, { status: 400 });

      const registerDate = new Date(date);
      const dayStart = new Date(registerDate.getFullYear(), registerDate.getMonth(), registerDate.getDate());

      // Upsert the register
      let register = await prisma.attendanceRegister.findFirst({
        where: { shiftId, supervisorId: userId, date: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) } },
      });

      if (!register) {
        register = await prisma.attendanceRegister.create({
          data: { shiftId, date: dayStart, supervisorId: userId, companyId, status: "PENDING" },
        });
      } else if (register.status !== "PENDING") {
        return NextResponse.json({ error: "Cannot edit a submitted register" }, { status: 400 });
      }

      // Upsert entries
      for (const entry of entries) {
        await prisma.attendanceEntry.upsert({
          where: { registerId_employeeId: { registerId: register.id, employeeId: entry.employeeId } },
          update: { status: entry.status, overtimeHours: entry.overtimeHours || 0, notes: entry.notes || null },
          create: {
            registerId: register.id,
            employeeId: entry.employeeId,
            status: entry.status,
            overtimeHours: entry.overtimeHours || 0,
            notes: entry.notes || null,
          },
        });
      }

      const updated = await prisma.attendanceRegister.findUnique({
        where: { id: register.id },
        include: { entries: { include: { employee: { select: { id: true, name: true } } } }, shift: true },
      });

      return NextResponse.json(updated);
    }

    // Action: Submit register for manager approval
    if (action === "submit") {
      const { registerId } = body;
      if (!registerId) return NextResponse.json({ error: "registerId required" }, { status: 400 });

      const register = await prisma.attendanceRegister.findUnique({
        where: { id: registerId },
        include: { shift: { select: { name: true, startTime: true, endTime: true, machine: { select: { name: true } } } } }
      });
      if (!register) return NextResponse.json({ error: "Register not found" }, { status: 404 });
      if (register.supervisorId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (register.status !== "PENDING") return NextResponse.json({ error: "Already submitted" }, { status: 400 });

      // Count entries for notification context
      const entryCount = await prisma.attendanceEntry.count({ where: { registerId } });

      const updated = await prisma.attendanceRegister.update({
        where: { id: registerId },
        data: { status: "APPROVED" },
      });

      // Fetch supervisor name for notification
      const supervisor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const shiftInfo = (register as any).shift;
      const machineName = shiftInfo?.machine?.name || "";
      const shiftName = shiftInfo?.name || "";

      // Notify managers
      const managers = await prisma.user.findMany({ where: { companyId: register.companyId, role: "MANAGER", isActive: true } });
      await prisma.notification.createMany({
        data: managers.map(m => ({
          type: "ATTENDANCE_SUBMITTED",
          title: "📋 Attendance Register Submitted",
          message: `${supervisor?.name || "Supervisor"} submitted attendance for ${shiftName}${machineName ? ` (${machineName})` : ""} - ${entryCount} workers logged.`,
          companyId: register.companyId,
          userId: m.id,
          priority: 3,
        })),
      });

      return NextResponse.json(updated);
    }

    // Action: Approve or Reject register
    if (action === "approve" || action === "reject") {
      if (!["MANAGER", "OWNER"].includes(role)) return NextResponse.json({ error: "Only managers can approve attendance" }, { status: 403 });

      const { registerId, notes } = body;
      if (!registerId) return NextResponse.json({ error: "registerId required" }, { status: 400 });

      const updated = await prisma.attendanceRegister.update({
        where: { id: registerId },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          managerId: userId,
          notes: notes || null,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error handling attendance:", error);
    return NextResponse.json({ error: "Failed to process attendance" }, { status: 500 });
  }
}
