import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const customizations = await prisma.orderCustomization.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customizations);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["OWNER", "MANAGER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Only managers and owners can create customizations" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await prisma.orderCustomization.findFirst({
      where: { companyId, name: name.trim() }
    });

    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.orderCustomization.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
        return NextResponse.json(reactivated);
      }
      return NextResponse.json({ error: "Customization already exists" }, { status: 409 });
    }

    const customization = await prisma.orderCustomization.create({
      data: { companyId, name: name.trim() }
    });

    return NextResponse.json(customization, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
