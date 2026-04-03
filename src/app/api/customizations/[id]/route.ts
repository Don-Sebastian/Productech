import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Only managers and owners can delete customizations" }, { status: 403 });
    }

    const customizationId = (await params).id;

    // Soft delete
    await prisma.orderCustomization.update({
      where: { id: customizationId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
