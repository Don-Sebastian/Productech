import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Get today's active session or recent sessions
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const view = searchParams.get("view"); // "approval" for supervisor/manager
    const shiftDate = date ? new Date(date) : new Date();
    shiftDate.setHours(0, 0, 0, 0);

    const sessionIncludes = {
      entries: {
        orderBy: { createdAt: "asc" as const },
        include: {
          category: { select: { id: true, name: true } },
          thickness: { select: { id: true, value: true } },
          size: { select: { id: true, label: true, length: true, width: true } },
        },
      },
      glueEntries: { orderBy: { time: "asc" as const } },
      pauseEvents: { orderBy: { startTime: "asc" as const } },
      operator: { select: { id: true, name: true, email: true } },
    };

    // Supervisor view: sessions awaiting supervisor approval
    if (view === "approval" && (role === "SUPERVISOR" || role === "MANAGER" || role === "OWNER")) {
      let statusFilter: any;
      if (role === "SUPERVISOR") {
        statusFilter = "SUBMITTED";
      } else if (role === "MANAGER" || role === "OWNER") {
        statusFilter = "SUPERVISOR_APPROVED";
      }

      const pendingSessions = await prisma.hotPressSession.findMany({
        where: {
          companyId,
          approvalStatus: statusFilter,
        },
        include: sessionIncludes,
        orderBy: { shiftDate: "desc" },
      });

      return NextResponse.json({ pendingSessions });
    }

    // History view: all past sessions (for supervisor, manager, owner)
    if (view === "history") {
      const fromDate = searchParams.get("from");
      const toDate = searchParams.get("to");
      const statusParam = searchParams.get("status"); // approval status filter
      const operatorParam = searchParams.get("operator"); // operator id filter
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = 50;

      const where: any = { companyId, status: "STOPPED" };

      // Operators can only see their own history
      if (role === "OPERATOR") {
        where.operatorId = userId;
      } else if (operatorParam) {
        where.operatorId = operatorParam;
      }

      // Date range filter
      if (fromDate || toDate) {
        where.shiftDate = {};
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          where.shiftDate.gte = from;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          where.shiftDate.lte = to;
        }
      }

      // Approval status filter
      if (statusParam && statusParam !== "ALL") {
        where.approvalStatus = statusParam;
      }

      const [historySessions, totalCount] = await Promise.all([
        prisma.hotPressSession.findMany({
          where,
          include: sessionIncludes,
          orderBy: { shiftDate: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.hotPressSession.count({ where }),
      ]);

      // Also get operators list for the filter dropdown
      const operators = await prisma.user.findMany({
        where: { companyId, role: "OPERATOR" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        sessions: historySessions,
        operators,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      });
    }

    // Operator view: active + today's stopped
    const activeSession = await prisma.hotPressSession.findFirst({
      where: {
        operatorId: userId,
        companyId,
        status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] },
      },
      include: sessionIncludes,
    });

    const todaySessions = await prisma.hotPressSession.findMany({
      where: {
        operatorId: userId,
        companyId,
        shiftDate,
        status: "STOPPED",
      },
      include: sessionIncludes,
      orderBy: { startTime: "desc" },
    });

    // Get products for selection
    const products = await prisma.companyProduct.findMany({
      where: { companyId, isActive: true },
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
        thickness: { select: { id: true, value: true } },
        size: { select: { id: true, label: true, length: true, width: true } },
      },
    });

    return NextResponse.json({
      activeSession,
      todaySessions,
      products,
    });
  } catch (e) {
    console.error("HotPress GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: All hot press actions
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ==================== START MACHINE ====================
      case "start": {
        const existing = await prisma.hotPressSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (existing) return NextResponse.json({ error: "Machine already running" }, { status: 400 });

        const shiftDate = new Date();
        shiftDate.setHours(0, 0, 0, 0);

        const newSession = await prisma.hotPressSession.create({
          data: {
            companyId,
            operatorId: userId,
            shiftDate,
            numDaylights: body.numDaylights || 10,
          },
        });
        return NextResponse.json(newSession);
      }

      // ==================== STOP MACHINE ====================
      case "stop": {
        const activeSession = await prisma.hotPressSession.findFirst({
          where: { operatorId: userId, status: { in: ["RUNNING", "PAUSED", "MAINTENANCE"] } },
        });
        if (!activeSession) return NextResponse.json({ error: "No active session" }, { status: 400 });

        // Close any open pause events
        await prisma.pauseEvent.updateMany({
          where: { sessionId: activeSession.id, endTime: null },
          data: { endTime: new Date() },
        });

        const stopped = await prisma.hotPressSession.update({
          where: { id: activeSession.id },
          data: { status: "STOPPED", stopTime: new Date() },
        });
        return NextResponse.json(stopped);
      }

      // ==================== SET PRODUCT ====================
      case "setProduct": {
        const { sessionId, categoryId, thicknessId, sizeId } = body;
        const updated = await prisma.hotPressSession.update({
          where: { id: sessionId },
          data: { currentCategoryId: categoryId, currentThicknessId: thicknessId, currentSizeId: sizeId },
        });
        return NextResponse.json(updated);
      }

      // ==================== SET DAYLIGHTS ====================
      case "setDaylights": {
        const { sessionId: sid, numDaylights } = body;
        const updated = await prisma.hotPressSession.update({
          where: { id: sid },
          data: { numDaylights: parseInt(numDaylights) || 10 },
        });
        return NextResponse.json(updated);
      }

      // ==================== LOAD (start cooking) ====================
      case "load": {
        const { sessionId: loadSid, type } = body;
        const sess = await prisma.hotPressSession.findUnique({ where: { id: loadSid } });
        if (!sess || !sess.currentCategoryId || !sess.currentThicknessId || !sess.currentSizeId) {
          return NextResponse.json({ error: "Select product first" }, { status: 400 });
        }

        const entry = await prisma.pressEntry.create({
          data: {
            type: type === "REPRESS" ? "REPRESS" : "COOK",
            loadTime: new Date(),
            quantity: sess.numDaylights,
            categoryId: sess.currentCategoryId,
            thicknessId: sess.currentThicknessId,
            sizeId: sess.currentSizeId,
            sessionId: loadSid,
          },
          include: {
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true, length: true, width: true } },
          },
        });
        return NextResponse.json(entry);
      }

      // ==================== UNLOAD (finish cooking) ====================
      case "unload": {
        const { entryId, quantity } = body;
        const entry = await prisma.pressEntry.update({
          where: { id: entryId },
          data: { unloadTime: new Date(), quantity: quantity ? parseInt(quantity) : undefined },
          include: {
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true, length: true, width: true } },
          },
        });
        return NextResponse.json(entry);
      }

      // ==================== UPDATE ENTRY QUANTITY ====================
      case "updateQuantity": {
        const { entryId: eId, quantity: qty } = body;
        const entry = await prisma.pressEntry.update({
          where: { id: eId },
          data: { quantity: parseInt(qty) },
        });
        return NextResponse.json(entry);
      }

      // ==================== GLUE ====================
      case "glue": {
        const { sessionId: glueSid, barrels } = body;
        const glueEntry = await prisma.glueEntry.create({
          data: { sessionId: glueSid, barrels: barrels || 1 },
        });
        return NextResponse.json(glueEntry);
      }

      // ==================== PAUSE ====================
      case "pause": {
        const { sessionId: pauseSid, notes } = body;
        await prisma.hotPressSession.update({
          where: { id: pauseSid },
          data: { status: "PAUSED" },
        });
        const pauseEvent = await prisma.pauseEvent.create({
          data: { sessionId: pauseSid, type: "PAUSE", notes },
        });
        return NextResponse.json(pauseEvent);
      }

      // ==================== MAINTENANCE ====================
      case "maintenance": {
        const { sessionId: maintSid, notes: maintNotes } = body;
        await prisma.hotPressSession.update({
          where: { id: maintSid },
          data: { status: "MAINTENANCE" },
        });
        const maintEvent = await prisma.pauseEvent.create({
          data: { sessionId: maintSid, type: "MAINTENANCE", notes: maintNotes },
        });
        return NextResponse.json(maintEvent);
      }

      // ==================== RESUME ====================
      case "resume": {
        const { sessionId: resumeSid } = body;
        const openPause = await prisma.pauseEvent.findFirst({
          where: { sessionId: resumeSid, endTime: null },
          orderBy: { startTime: "desc" },
        });
        if (openPause) {
          await prisma.pauseEvent.update({
            where: { id: openPause.id },
            data: { endTime: new Date() },
          });
        }
        await prisma.hotPressSession.update({
          where: { id: resumeSid },
          data: { status: "RUNNING" },
        });
        return NextResponse.json({ success: true });
      }

      // ==================== OPERATOR SUBMIT (verify & send to supervisor) ====================
      case "operatorSubmit": {
        const { sessionId: submitSid } = body;
        const sess = await prisma.hotPressSession.findUnique({ where: { id: submitSid } });
        if (!sess || sess.status !== "STOPPED") {
          return NextResponse.json({ error: "Session must be stopped first" }, { status: 400 });
        }
        const updated = await prisma.hotPressSession.update({
          where: { id: submitSid },
          data: {
            approvalStatus: "SUBMITTED",
            operatorApprovedAt: new Date(),
          },
        });
        return NextResponse.json(updated);
      }

      // ==================== SUPERVISOR APPROVE ====================
      case "supervisorApprove": {
        if (role !== "SUPERVISOR" && role !== "MANAGER" && role !== "OWNER") {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
        const { sessionId: supSid } = body;
        const sess = await prisma.hotPressSession.findUnique({ where: { id: supSid } });
        if (!sess || sess.approvalStatus !== "SUBMITTED") {
          return NextResponse.json({ error: "Session not pending supervisor approval" }, { status: 400 });
        }
        const updated = await prisma.hotPressSession.update({
          where: { id: supSid },
          data: {
            approvalStatus: "SUPERVISOR_APPROVED",
            supervisorApprovedAt: new Date(),
            supervisorId: userId,
          },
        });
        return NextResponse.json(updated);
      }

      // ==================== MANAGER APPROVE (+ update stock) ====================
      case "managerApprove": {
        if (role !== "MANAGER" && role !== "OWNER") {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
        const { sessionId: mgrSid } = body;
        const sess = await prisma.hotPressSession.findUnique({
          where: { id: mgrSid },
          include: {
            entries: {
              where: { unloadTime: { not: null } }, // only completed entries
              include: {
                category: true,
                thickness: true,
                size: true,
              },
            },
          },
        });
        if (!sess || sess.approvalStatus !== "SUPERVISOR_APPROVED") {
          return NextResponse.json({ error: "Session not pending manager approval" }, { status: 400 });
        }

        // Update stock: for each completed entry, add quantity to CompanyProduct
        for (const entry of sess.entries) {
          if (entry.type === "COOK") {
            await prisma.companyProduct.updateMany({
              where: {
                companyId,
                categoryId: entry.categoryId,
                thicknessId: entry.thicknessId,
                sizeId: entry.sizeId,
              },
              data: { currentStock: { increment: entry.quantity } },
            });
          }
        }

        const updated = await prisma.hotPressSession.update({
          where: { id: mgrSid },
          data: {
            approvalStatus: "MANAGER_APPROVED",
            managerApprovedAt: new Date(),
            managerId: userId,
          },
        });
        return NextResponse.json(updated);
      }

      // ==================== REJECT (supervisor or manager) ====================
      case "reject": {
        if (role !== "SUPERVISOR" && role !== "MANAGER" && role !== "OWNER") {
          return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }
        const { sessionId: rejSid, note } = body;
        const updated = await prisma.hotPressSession.update({
          where: { id: rejSid },
          data: {
            approvalStatus: "REJECTED",
            rejectionNote: note || "Rejected",
          },
        });
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("HotPress POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
