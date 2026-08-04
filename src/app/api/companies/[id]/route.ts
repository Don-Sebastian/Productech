import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, location, phone, ownerId } = body;

    if (!name || !email || !location) {
      return NextResponse.json({ error: "Name, email and location are required" }, { status: 400 });
    }

    // Check email uniqueness if email has changed
    const existingCompany = await prisma.company.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });
    if (existingCompany) {
      return NextResponse.json({ error: "A company with this email already exists" }, { status: 400 });
    }

    // Fetch the current company to check if owner is changing
    const currentCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!currentCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        email,
        location,
        phone: phone || null,
        ownerId: ownerId || null,
      },
    });

    // If ownerId has changed, update users' companyId accordingly
    if (ownerId && ownerId !== currentCompany.ownerId) {
      // Set new owner's companyId to this company
      await prisma.user.update({
        where: { id: ownerId },
        data: { companyId: id },
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete the company (cascades to related models in Prisma schema)
    await prisma.company.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
