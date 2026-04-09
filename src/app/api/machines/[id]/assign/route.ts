import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: Assign a user to this machine
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const { id: machineId } = await params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (!["OPERATOR", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Role must be OPERATOR or SUPERVISOR" }, { status: 400 });
    }

    // Verify machine exists and belongs to company
    const machine = await prisma.machine.findFirst({
      where: { id: machineId, companyId },
    });
    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    // Verify user exists and belongs to company
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already assigned to this machine (active)
    const existingAssignment = await prisma.machineAssignment.findFirst({
      where: { machineId, userId, role, removedAt: null },
    });
    if (existingAssignment) {
      return NextResponse.json({ error: "User is already assigned to this machine" }, { status: 400 });
    }

    // Create new assignment
    const assignment = await prisma.machineAssignment.create({
      data: {
        machineId,
        userId,
        role,
        companyId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        machine: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning user:", error);
    return NextResponse.json({ error: "Failed to assign user" }, { status: 500 });
  }
}

// DELETE: Unassign a user from this machine
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!["MANAGER", "OWNER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: machineId } = await params;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    // Close the assignment (don't delete — keep history)
    await prisma.machineAssignment.update({
      where: { id: assignmentId },
      data: { removedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unassigning user:", error);
    return NextResponse.json({ error: "Failed to unassign user" }, { status: 500 });
  }
}
