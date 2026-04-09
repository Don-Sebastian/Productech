import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const shiftDate = new Date();
    shiftDate.setHours(0, 0, 0, 0);

    const [activeSession, todaySessions, productionLists] = await Promise.all([
      (prisma as any).dryerSession.findFirst({
        where: { operatorId: userId, companyId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        include: {
          batches: { orderBy: { loadTime: "asc" } },
          checks: { orderBy: { timestamp: "asc" } },
          pauseEvents: { orderBy: { startTime: "asc" } },
        },
      }),
      (prisma as any).dryerSession.findMany({
        where: { operatorId: userId, companyId, shiftDate, status: "STOPPED" },
        include: {
          batches: { orderBy: { loadTime: "asc" } },
          checks: { orderBy: { timestamp: "asc" } },
          pauseEvents: { orderBy: { startTime: "asc" } },
        },
        orderBy: { startTime: "desc" },
      }),
      prisma.productionList.findMany({
        where: { companyId, status: { not: "COMPLETED" } },
        include: {
          order: { select: { orderNumber: true, customer: { select: { name: true } } } },
          items: {
            include: {
              category: { select: { id: true, name: true } },
              thickness: { select: { id: true, value: true } },
              size: { select: { id: true, label: true, length: true, width: true } },
            },
          },
        },
        orderBy: { priority: "asc" },
      }),
    ]);

    return NextResponse.json({ activeSession, todaySessions, productionLists });
  } catch (e) {
    console.error("Dryer GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "start": {
        const existing = await (prisma as any).dryerSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (existing) return NextResponse.json({ error: "Machine already running" }, { status: 400 });

        const shiftDate = new Date();
        shiftDate.setHours(0, 0, 0, 0);

        const assignment = await (prisma as any).machineAssignment.findFirst({
          where: { userId, role: "OPERATOR", removedAt: null, machine: { section: { slug: "dryer" }, isActive: true } },
          include: { machine: { select: { id: true } } },
        });

        const newSession = await (prisma as any).dryerSession.create({
          data: { companyId, operatorId: userId, machineId: assignment?.machine?.id || null, shiftDate },
        });
        return NextResponse.json(newSession);
      }

      case "stop": {
        const active = await (prisma as any).dryerSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (!active) return NextResponse.json({ error: "No active session" }, { status: 400 });

        await (prisma as any).dryerPauseEvent.updateMany({
          where: { sessionId: active.id, endTime: null },
          data: { endTime: new Date() },
        });

        const stopped = await (prisma as any).dryerSession.update({
          where: { id: active.id },
          data: { status: "STOPPED", stopTime: new Date() },
        });
        return NextResponse.json(stopped);
      }

      case "pause": {
        const { sessionId } = body;
        await (prisma as any).dryerSession.update({ where: { id: sessionId }, data: { status: "PAUSED" } });
        const pe = await (prisma as any).dryerPauseEvent.create({ data: { sessionId, type: "PAUSE" } });
        return NextResponse.json(pe);
      }

      case "maintenance": {
        const { sessionId: mSid } = body;
        await (prisma as any).dryerSession.update({ where: { id: mSid }, data: { status: "MAINTENANCE" } });
        const me = await (prisma as any).dryerPauseEvent.create({ data: { sessionId: mSid, type: "MAINTENANCE" } });
        return NextResponse.json(me);
      }

      case "resume": {
        const { sessionId: rSid } = body;
        const openPause = await (prisma as any).dryerPauseEvent.findFirst({
          where: { sessionId: rSid, endTime: null }, orderBy: { startTime: "desc" },
        });
        if (openPause) {
          await (prisma as any).dryerPauseEvent.update({ where: { id: openPause.id }, data: { endTime: new Date() } });
        }
        await (prisma as any).dryerSession.update({ where: { id: rSid }, data: { status: "RUNNING" } });
        return NextResponse.json({ success: true });
      }

      case "loadBatch": {
        const { sessionId: bSid, veneerThickness, quantity } = body;
        if (!bSid || !veneerThickness) {
          return NextResponse.json({ error: "Session and thickness required" }, { status: 400 });
        }
        const batch = await (prisma as any).dryerBatch.create({
          data: { sessionId: bSid, veneerThickness: parseFloat(veneerThickness), quantity: parseInt(quantity) || 0 },
        });
        return NextResponse.json(batch);
      }

      case "unloadBatch": {
        const { batchId } = body;
        const batch = await (prisma as any).dryerBatch.update({
          where: { id: batchId },
          data: { unloadTime: new Date() },
        });
        return NextResponse.json(batch);
      }

      case "addCheck": {
        const { sessionId: cSid, beltSpeed, dryerTemp, boilerTemp, notes } = body;
        if (!cSid) return NextResponse.json({ error: "Session required" }, { status: 400 });
        const check = await (prisma as any).dryerCheck.create({
          data: {
            sessionId: cSid,
            beltSpeed: parseFloat(beltSpeed) || 0,
            dryerTemp: parseFloat(dryerTemp) || 0,
            boilerTemp: parseFloat(boilerTemp) || 0,
            notes: notes || null,
          },
        });
        return NextResponse.json(check);
      }

      case "toggleAutoCheck": {
        const { sessionId: tSid, enabled, intervalMinutes } = body;
        const updated = await (prisma as any).dryerSession.update({
          where: { id: tSid },
          data: {
            autoCheckEnabled: !!enabled,
            ...(intervalMinutes ? { autoCheckIntervalMinutes: parseInt(intervalMinutes) } : {}),
          },
        });
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("Dryer POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
