import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT: Update a machine
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const machine = await prisma.machine.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(machine);
  } catch (error) {
    console.error("Error updating machine:", error);
    return NextResponse.json({ error: "Failed to update machine" }, { status: 500 });
  }
}

// DELETE: Soft-deactivate a machine
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Soft delete: deactivate and remove all current assignments
    await prisma.$transaction([
      prisma.machineAssignment.updateMany({
        where: { machineId: id, removedAt: null },
        data: { removedAt: new Date() },
      }),
      prisma.machine.update({
        where: { id },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting machine:", error);
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}
