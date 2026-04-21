import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");

    const where: any = { companyId, isActive: true };
    if (machineId) where.machineId = machineId;

    if (role === "SUPERVISOR") {
      const assignments = await prisma.subDepartmentAssignment.findMany({
        where: { userId },
        select: { subDepartmentId: true }
      });
      const validDepts = assignments.map((a: any) => a.subDepartmentId);
      where.OR = [
        { subDepartmentId: { in: validDepts } },
        { subDepartmentId: null }
      ];
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: { 
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } }
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = (session.user as any).companyId;

    const { name, startTime, endTime, machineId, subDepartmentId } = await request.json();
    if (!name || !startTime || !endTime) return NextResponse.json({ error: "Name, start time, and end time are required" }, { status: 400 });

    const shift = await prisma.shift.create({
      data: { name, startTime, endTime, machineId: machineId || null, subDepartmentId: subDepartmentId || null, companyId },
      include: { 
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name, startTime, endTime, machineId, subDepartmentId, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(machineId !== undefined && { machineId: machineId || null }),
        ...(subDepartmentId !== undefined && { subDepartmentId: subDepartmentId || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { 
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating shift:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.shift.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
