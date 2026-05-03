import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Role hierarchy: who can reset whose password
const MANAGEABLE_ROLES: Record<string, string[]> = {
  ADMIN: ["OWNER"],
  OWNER: ["MANAGER"],
  MANAGER: ["SUPERVISOR", "OPERATOR"],
};

// PUT - Reset a subordinate's password (creator-initiated)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (session.user as any).role;
    const callerId = (session.user as any).id;
    const callerCompanyId = (session.user as any).companyId;

    const manageableRoles = MANAGEABLE_ROLES[callerRole];
    if (!manageableRoles) {
      return NextResponse.json(
        { error: "You do not have permission to reset passwords" },
        { status: 403 }
      );
    }

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Fetch the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true, createdById: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Authorization check: role hierarchy
    if (!manageableRoles.includes(targetUser.role)) {
      return NextResponse.json(
        { error: "You cannot reset this user's password" },
        { status: 403 }
      );
    }

    // Company check (non-admin users must be in the same company)
    if (callerRole !== "ADMIN" && targetUser.companyId !== callerCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Creator check: only the user who created this account can reset their password
    // Admin is exempt from this check (they manage all owners)
    if (callerRole !== "ADMIN" && targetUser.createdById !== callerId) {
      return NextResponse.json(
        { error: "You can only reset passwords for users you created" },
        { status: 403 }
      );
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: `Password reset successfully for ${targetUser.name}`,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
