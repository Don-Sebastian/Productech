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
      where.id = { in: assignments.map((a: any) => a.subDepartmentId) };
    }

    const subDepartments = await prisma.subDepartment.findMany({
      where,
      include: { 
        machine: { select: { name: true } },
        supervisorAssignments: { include: { user: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subDepartments);
  } catch (error) {
    console.error("Error fetching sub-departments:", error);
    return NextResponse.json({ error: "Failed to fetch sub-departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Only managers and owners can create sub-departments" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const { name, machineId, supervisorIds } = await request.json();

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const subDepartment = await prisma.subDepartment.create({
      data: { 
        name, 
        machineId: machineId || null, 
        companyId,
        ...(supervisorIds && Array.isArray(supervisorIds) ? {
          supervisorAssignments: {
            create: supervisorIds.map((id: string) => ({ userId: id }))
          }
        } : {})
      },
      include: { 
        machine: { select: { name: true } },
        supervisorAssignments: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    return NextResponse.json(subDepartment, { status: 201 });
  } catch (error) {
    console.error("Error creating sub-department:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name, machineId, isActive, supervisorIds } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (supervisorIds && Array.isArray(supervisorIds)) {
      await prisma.subDepartmentAssignment.deleteMany({ where: { subDepartmentId: id } });
    }

    const updated = await prisma.subDepartment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(machineId !== undefined && { machineId: machineId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(supervisorIds && Array.isArray(supervisorIds) ? {
          supervisorAssignments: {
            create: supervisorIds.map((userId: string) => ({ userId }))
          }
        } : {})
      },
      include: { 
        machine: { select: { name: true } },
        supervisorAssignments: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sub-department:", error);
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

    await prisma.subDepartment.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sub-department:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
