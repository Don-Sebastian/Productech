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

    const [activeSession, todaySessions, materials, productionLists] = await Promise.all([
      (prisma as any).peelingSession.findFirst({
        where: { operatorId: userId, companyId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        include: {
          entries: { orderBy: { timestamp: "asc" }, include: { peelingMaterial: true } },
          pauseEvents: { orderBy: { startTime: "asc" } },
        },
      }),
      (prisma as any).peelingSession.findMany({
        where: { operatorId: userId, companyId, shiftDate, status: "STOPPED" },
        include: {
          entries: { orderBy: { timestamp: "asc" }, include: { peelingMaterial: true } },
          pauseEvents: { orderBy: { startTime: "asc" } },
        },
        orderBy: { startTime: "desc" },
      }),
      (prisma as any).peelingMaterial.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ treeType: "asc" }, { veneerThickness: "asc" }],
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

    return NextResponse.json({ activeSession, todaySessions, materials, productionLists });
  } catch (e) {
    console.error("Peeling GET error:", e);
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
        const existing = await (prisma as any).peelingSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (existing) return NextResponse.json({ error: "Machine already running" }, { status: 400 });

        const shiftDate = new Date();
        shiftDate.setHours(0, 0, 0, 0);

        const assignment = await (prisma as any).machineAssignment.findFirst({
          where: { userId, role: "OPERATOR", removedAt: null, machine: { section: { slug: "peeling" }, isActive: true } },
          include: { machine: { select: { id: true } } },
        });

        const newSession = await (prisma as any).peelingSession.create({
          data: { companyId, operatorId: userId, machineId: assignment?.machine?.id || null, shiftDate },
        });
        return NextResponse.json(newSession);
      }

      case "stop": {
        const active = await (prisma as any).peelingSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (!active) return NextResponse.json({ error: "No active session" }, { status: 400 });

        await (prisma as any).peelingPauseEvent.updateMany({
          where: { sessionId: active.id, endTime: null },
          data: { endTime: new Date() },
        });

        const stopped = await (prisma as any).peelingSession.update({
          where: { id: active.id },
          data: { status: "STOPPED", stopTime: new Date() },
        });
        return NextResponse.json(stopped);
      }

      case "pause": {
        const { sessionId } = body;
        await (prisma as any).peelingSession.update({ where: { id: sessionId }, data: { status: "PAUSED" } });
        const pe = await (prisma as any).peelingPauseEvent.create({ data: { sessionId, type: "PAUSE" } });
        return NextResponse.json(pe);
      }

      case "maintenance": {
        const { sessionId: mSid } = body;
        await (prisma as any).peelingSession.update({ where: { id: mSid }, data: { status: "MAINTENANCE" } });
        const me = await (prisma as any).peelingPauseEvent.create({ data: { sessionId: mSid, type: "MAINTENANCE" } });
        return NextResponse.json(me);
      }

      case "resume": {
        const { sessionId: rSid } = body;
        const openPause = await (prisma as any).peelingPauseEvent.findFirst({
          where: { sessionId: rSid, endTime: null }, orderBy: { startTime: "desc" },
        });
        if (openPause) {
          await (prisma as any).peelingPauseEvent.update({ where: { id: openPause.id }, data: { endTime: new Date() } });
        }
        await (prisma as any).peelingSession.update({ where: { id: rSid }, data: { status: "RUNNING" } });
        return NextResponse.json({ success: true });
      }

      case "addEntry": {
        const { sessionId: eSid, peelingMaterialId, quantity, logCount, notes } = body;
        if (!eSid || !peelingMaterialId) {
          return NextResponse.json({ error: "Session and material required" }, { status: 400 });
        }
        const entry = await (prisma as any).peelingEntry.create({
          data: {
            sessionId: eSid,
            peelingMaterialId,
            quantity: parseInt(quantity) || 0,
            logCount: parseInt(logCount) || 0,
            notes: notes || null,
          },
          include: { peelingMaterial: true },
        });
        return NextResponse.json(entry);
      }

      case "deleteEntry": {
        const { entryId } = body;
        await (prisma as any).peelingEntry.delete({ where: { id: entryId } });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("Peeling POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
