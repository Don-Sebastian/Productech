import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: List all machines (optionally filtered by sectionId)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");

    const where: any = { companyId };
    if (sectionId) where.sectionId = sectionId;

    const machines = await prisma.machine.findMany({
      where,
      include: {
        section: { select: { id: true, name: true, slug: true } },
        assignments: {
          where: { removedAt: null }, // only current assignments
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error("Error fetching machines:", error);
    return NextResponse.json({ error: "Failed to fetch machines" }, { status: 500 });
  }
}

// POST: Create a new machine
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Only managers can create machines" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await request.json();
    const { name, code, sectionId, operatorId, supervisorId } = body;

    if (!name || !code || !sectionId || !operatorId || !supervisorId) {
      return NextResponse.json({ error: "Name, code, department, operator, and supervisor are required" }, { status: 400 });
    }

    // Verify section belongs to company
    const section = await prisma.section.findFirst({
      where: { id: sectionId, companyId },
    });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check unique code within company
    const existing = await prisma.machine.findUnique({
      where: { companyId_code: { companyId, code: code.toUpperCase() } },
    });
    if (existing) {
      return NextResponse.json({ error: "A machine with this code already exists" }, { status: 400 });
    }

    const count = await (prisma as any).machine.count({ where: { companyId, sectionId } });

    const machine = await (prisma as any).machine.create({
      data: {
        name,
        code: code.toUpperCase(),
        sectionId,
        companyId,
        sortOrder: count + 1,
        assignments: {
          create: [
            { userId: operatorId, role: "OPERATOR", companyId },
            { userId: supervisorId, role: "SUPERVISOR", companyId }
          ]
        }
      },
      include: {
        section: { select: { id: true, name: true, slug: true } },
        assignments: {
          where: { removedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error: any) {
    console.error("DEBUG: Machine POST error:", error);
    return NextResponse.json({ 
      error: "Failed to create machine", 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
