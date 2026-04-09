import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["OPERATOR", "SUPERVISOR"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const assignment = await (prisma as any).machineAssignment.findFirst({
      where: {
        userId,
        role: role, // Match the user's actual role
        removedAt: null,
        machine: { isActive: true },
      },
      include: {
        machine: {
          include: {
            section: true,
          },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error fetching operator assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
