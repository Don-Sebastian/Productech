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
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = { companyId };
    if (!includeInactive) where.isActive = true;
    if (machineId) where.machineId = machineId;

    if (role === "SUPERVISOR") {
      const assignments = await prisma.subDepartmentAssignment.findMany({
        where: { userId },
        select: { subDepartmentId: true }
      });
      where.subDepartmentId = { in: assignments.map((a: any) => a.subDepartmentId) };
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } },
        wageLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
          include: { changedBy: { select: { name: true, role: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER", "SUPERVISOR"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const companyId = (session.user as any).companyId;
    const { name, phone, machineId, subDepartmentId, wageType, wageAmount, photoData } = await request.json();

    if (!name) return NextResponse.json({ error: "Employee name is required" }, { status: 400 });

    const employee = await prisma.employee.create({
      data: {
        name,
        phone: phone || null,
        photoData: photoData || null,
        wageType: wageType || "DAILY",
        wageAmount: parseFloat(wageAmount) || 0,
        machineId: machineId || null,
        subDepartmentId: subDepartmentId || null,
        companyId,
      },
      include: {
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER", "SUPERVISOR"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const { id, name, phone, machineId, subDepartmentId, wageType, wageAmount, photoData, isActive } = await request.json();

    if (!id) return NextResponse.json({ error: "Employee ID required" }, { status: 400 });

    // Fetch current employee data to log wage changes
    const current = await prisma.employee.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    // Determine if wage is changing
    const wageChanging = wageAmount !== undefined && (parseFloat(wageAmount) !== current.wageAmount || (wageType && wageType !== current.wageType));

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(photoData !== undefined && { photoData: photoData || null }),
        ...(machineId !== undefined && { machineId: machineId || null }),
        ...(subDepartmentId !== undefined && { subDepartmentId: subDepartmentId || null }),
        ...(wageType !== undefined && { wageType }),
        ...(wageAmount !== undefined && { wageAmount: parseFloat(wageAmount) }),
        ...(isActive !== undefined && { isActive }),
        ...(wageChanging && { wageLastAdjustedBy: userId, wageLastAdjustedAt: new Date() }),
      },
      include: {
        machine: { select: { id: true, name: true } },
        subDepartment: { select: { id: true, name: true } },
      },
    });

    // Log wage adjustment
    if (wageChanging) {
      await prisma.wageAdjustmentLog.create({
        data: {
          employeeId: id,
          beforeAmount: current.wageAmount,
          afterAmount: parseFloat(wageAmount),
          wageType: wageType || current.wageType,
          changedById: userId,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER", "SUPERVISOR"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Soft delete
    await prisma.employee.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
