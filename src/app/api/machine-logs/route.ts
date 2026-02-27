import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch machine logs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    if (!companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const section = searchParams.get("section");

    const whereClause: any = { companyId };

    // Operators can only see their own logs
    if (role === "OPERATOR") {
      whereClause.operatorId = session.user.id;
    }

    if (dateStr) {
      const date = new Date(dateStr);
      whereClause.shiftDate = date;
    }

    if (section) {
      whereClause.section = section;
    }

    const logs = await prisma.machineLog.findMany({
      where: whereClause,
      include: {
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching machine logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch machine logs" },
      { status: 500 }
    );
  }
}

// POST: Create a new machine log entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "OPERATOR" && role !== "SUPERVISOR") {
      return NextResponse.json(
        { error: "Only operators and supervisors can log machine actions" },
        { status: 403 }
      );
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const body = await request.json();
    const { machineName, action, notes, section, shiftDate } = body;

    if (!machineName || !action || !shiftDate) {
      return NextResponse.json(
        { error: "Machine name, action, and shift date are required" },
        { status: 400 }
      );
    }

    const validActions = ["START", "STOP", "PAUSE", "RESUME", "MAINTENANCE", "BREAKDOWN"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    const log = await prisma.machineLog.create({
      data: {
        machineName,
        action,
        notes: notes || null,
        section: section || null,
        shiftDate: new Date(shiftDate),
        companyId,
        operatorId: session.user.id,
      },
      include: {
        operator: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      { message: "Machine action logged", log },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating machine log:", error);
    return NextResponse.json(
      { error: "Failed to log machine action" },
      { status: 500 }
    );
  }
}
