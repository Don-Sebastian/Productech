import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Live Machine Production API
// Returns active (running/paused/maintenance) + today's stopped sessions
// For supervisors: filtered to their assigned machines
// For managers/owners: all company machines
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    if (!["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For supervisors: get their machine assignments to filter
    let supervisorMachineIds: string[] | null = null;
    if (role === "SUPERVISOR") {
      const assignments = await prisma.machineAssignment.findMany({
        where: { userId, role: "SUPERVISOR", removedAt: null },
        select: { machineId: true },
      });
      supervisorMachineIds = assignments.map(a => a.machineId);
    }

    // Common operator includes for all session types
    const operatorSelect = { id: true, name: true };
    const machineSelect = { id: true, name: true, code: true, section: { select: { name: true, slug: true } } };

    // Fetch active + today sessions from all sections in parallel
    const [
      hotPressActive, hotPressToday,
      peelingActive, peelingToday,
      dryerActive, dryerToday,
      finishingToday,
    ] = await Promise.all([
      // ===== HOT PRESS =====
      prisma.hotPressSession.findMany({
        where: {
          companyId,
          status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] },
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          numDaylights: true, approvalStatus: true,
          operator: { select: operatorSelect },
          machine: { select: machineSelect },
          entries: {
            select: {
              id: true, type: true, loadTime: true, unloadTime: true, quantity: true,
              category: { select: { name: true } },
              thickness: { select: { value: true } },
              size: { select: { label: true, length: true, width: true, sqft: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          glueEntries: { select: { barrels: true, time: true } },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
      }),
      prisma.hotPressSession.findMany({
        where: {
          companyId, status: "STOPPED", shiftDate: today,
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          numDaylights: true, approvalStatus: true,
          operator: { select: operatorSelect },
          machine: { select: machineSelect },
          entries: {
            where: { unloadTime: { not: null } },
            select: {
              id: true, type: true, loadTime: true, unloadTime: true, quantity: true,
              category: { select: { name: true } },
              thickness: { select: { value: true } },
              size: { select: { label: true, length: true, width: true, sqft: true } },
            },
          },
          glueEntries: { select: { barrels: true } },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
        orderBy: { stopTime: "desc" },
      }),

      // ===== PEELING =====
      (prisma as any).peelingSession.findMany({
        where: {
          companyId,
          status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] },
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          operator: { select: operatorSelect },
          entries: {
            select: {
              id: true, quantity: true, logCount: true, timestamp: true,
              peelingMaterial: { select: { treeType: true, veneerThickness: true } },
            },
          },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
      }),
      (prisma as any).peelingSession.findMany({
        where: {
          companyId, status: "STOPPED", shiftDate: today,
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          operator: { select: operatorSelect },
          entries: {
            select: {
              id: true, quantity: true, logCount: true, timestamp: true,
              peelingMaterial: { select: { treeType: true, veneerThickness: true } },
            },
          },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
        orderBy: { stopTime: "desc" },
      }),

      // ===== DRYER =====
      (prisma as any).dryerSession.findMany({
        where: {
          companyId,
          status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] },
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          operator: { select: operatorSelect },
          batches: {
            select: { id: true, veneerThickness: true, loadTime: true, unloadTime: true, quantity: true },
          },
          checks: {
            select: { id: true, beltSpeed: true, dryerTemp: true, boilerTemp: true, timestamp: true },
            orderBy: { timestamp: "desc" },
            take: 3,
          },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
      }),
      (prisma as any).dryerSession.findMany({
        where: {
          companyId, status: "STOPPED", shiftDate: today,
          ...(supervisorMachineIds ? { machineId: { in: supervisorMachineIds } } : {}),
        },
        select: {
          id: true, status: true, startTime: true, stopTime: true, shiftDate: true,
          operator: { select: operatorSelect },
          batches: {
            select: { id: true, veneerThickness: true, loadTime: true, unloadTime: true, quantity: true },
          },
          checks: { select: { id: true }, },
          pauseEvents: { select: { type: true, startTime: true, endTime: true } },
        },
        orderBy: { stopTime: "desc" },
      }),

      // ===== FINISHING =====
      (prisma as any).finishingLog.findMany({
        where: { companyId, shiftDate: today },
        select: {
          id: true, shiftDate: true, createdAt: true,
          operator: { select: operatorSelect },
          entries: {
            select: {
              id: true, quantity: true, timestamp: true,
              category: { select: { name: true } },
              thickness: { select: { value: true } },
              size: { select: { label: true, length: true, width: true } },
            },
            orderBy: { timestamp: "desc" },
          },
        },
      }),
    ]);

    // Normalize into unified shape
    const liveSessions: any[] = [];

    // Hot Press
    [...hotPressActive, ...hotPressToday].forEach(s => {
      const cooks = s.entries.filter((e: any) => e.type === "COOK");
      const cookingNow = s.entries.find((e: any) => e.loadTime && !e.unloadTime);
      liveSessions.push({
        id: s.id, section: "hotpress", sectionLabel: "Hot Press",
        status: s.status, startTime: s.startTime, stopTime: s.stopTime, shiftDate: s.shiftDate,
        operator: s.operator, machine: s.machine,
        approvalStatus: s.approvalStatus,
        isActive: s.status !== "STOPPED",
        isCooking: !!cookingNow,
        cookingEntry: cookingNow ? {
          type: cookingNow.type,
          loadTime: cookingNow.loadTime,
          category: cookingNow.category?.name,
          thickness: cookingNow.thickness?.value,
          size: cookingNow.size ? `${cookingNow.size.length}×${cookingNow.size.width}` : "",
        } : null,
        stats: {
          totalCooks: cooks.filter((e: any) => e.unloadTime).length,
          totalRepresses: s.entries.filter((e: any) => e.type === "REPRESS" && e.unloadTime).length,
          totalSheets: cooks.filter((e: any) => e.unloadTime).reduce((a: number, e: any) => a + e.quantity, 0),
          totalGlue: s.glueEntries.reduce((a: number, g: any) => a + g.barrels, 0),
          totalSqft: cooks.filter((e: any) => e.unloadTime).reduce((a: number, e: any) => a + e.quantity * (e.size?.sqft || 0), 0),
        },
        entries: s.entries,
        pauseEvents: s.pauseEvents,
      });
    });

    // Peeling
    [...peelingActive, ...peelingToday].forEach((s: any) => {
      liveSessions.push({
        id: s.id, section: "peeling", sectionLabel: "Peeling",
        status: s.status, startTime: s.startTime, stopTime: s.stopTime, shiftDate: s.shiftDate,
        operator: s.operator, machine: null,
        isActive: s.status !== "STOPPED",
        stats: {
          totalSheets: s.entries.reduce((a: number, e: any) => a + e.quantity, 0),
          totalLogs: s.entries.reduce((a: number, e: any) => a + e.logCount, 0),
          totalEntries: s.entries.length,
        },
        entries: s.entries,
        pauseEvents: s.pauseEvents,
      });
    });

    // Dryer
    [...dryerActive, ...dryerToday].forEach((s: any) => {
      const activeBatch = s.batches?.find((b: any) => b.loadTime && !b.unloadTime);
      liveSessions.push({
        id: s.id, section: "dryer", sectionLabel: "Dryer",
        status: s.status, startTime: s.startTime, stopTime: s.stopTime, shiftDate: s.shiftDate,
        operator: s.operator, machine: null,
        isActive: s.status !== "STOPPED",
        activeBatch: activeBatch ? {
          veneerThickness: activeBatch.veneerThickness,
          loadTime: activeBatch.loadTime,
          quantity: activeBatch.quantity,
        } : null,
        stats: {
          totalBatches: s.batches?.length || 0,
          totalSheets: s.batches?.reduce((a: number, b: any) => a + b.quantity, 0) || 0,
          totalChecks: s.checks?.length || 0,
          latestCheck: s.checks?.[0] || null,
        },
        entries: s.batches || [],
        pauseEvents: s.pauseEvents,
      });
    });

    // Finishing (no active/stopped status - just daily log)
    finishingToday.forEach((l: any) => {
      if (l.entries.length === 0) return; // skip empty logs
      liveSessions.push({
        id: l.id, section: "finishing", sectionLabel: "Finishing",
        status: "ACTIVE", startTime: l.createdAt, stopTime: null, shiftDate: l.shiftDate,
        operator: l.operator, machine: null,
        isActive: true,
        stats: {
          totalSheets: l.entries.reduce((a: number, e: any) => a + e.quantity, 0),
          totalEntries: l.entries.length,
        },
        entries: l.entries,
        pauseEvents: [],
      });
    });

    // Sort: active first, then by start time desc
    liveSessions.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });

    return NextResponse.json({ sessions: liveSessions });
  } catch (e) {
    console.error("Live Machine Log error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
