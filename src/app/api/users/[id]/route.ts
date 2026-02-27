import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const MANAGEABLE_ROLES: Record<string, string[]> = {
  ADMIN: ["OWNER"],
  OWNER: ["MANAGER"],
  MANAGER: ["SUPERVISOR", "OPERATOR"],
};

// GET: Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        section: true,
        isActive: true,
        createdAt: true,
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Authorization check: users can only view users they manage
    const manageableRoles = MANAGEABLE_ROLES[userRole];
    if (!manageableRoles?.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (userRole !== "ADMIN" && user.company?.id !== companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT: Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    const body = await request.json();
    const { name, email, password, phone, section, isActive } = body;

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Authorization check
    const manageableRoles = MANAGEABLE_ROLES[userRole];
    if (!manageableRoles?.includes(targetUser.role)) {
      return NextResponse.json({ error: "You cannot edit this user" }, { status: 403 });
    }

    if (userRole !== "ADMIN" && targetUser.companyId !== companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check email uniqueness if changing
    if (email && email !== targetUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (section !== undefined) updateData.section = section;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        section: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Authorization check
    const manageableRoles = MANAGEABLE_ROLES[userRole];
    if (!manageableRoles?.includes(targetUser.role)) {
      return NextResponse.json({ error: "You cannot delete this user" }, { status: 403 });
    }

    if (userRole !== "ADMIN" && targetUser.companyId !== companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
