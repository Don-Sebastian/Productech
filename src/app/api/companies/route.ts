import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            sections: true,
            companyProducts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, location, phone, ownerId } = body;

    if (!name || !email || !location) {
      return NextResponse.json({ error: "Name, email and location are required" }, { status: 400 });
    }

    // Check email uniqueness
    const existingCompany = await prisma.company.findUnique({
      where: { email },
    });
    if (existingCompany) {
      return NextResponse.json({ error: "A company with this email already exists" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name,
        email,
        location,
        phone: phone || null,
        ownerId: ownerId || null,
      },
    });

    // If ownerId is provided, set their companyId to this new company
    if (ownerId) {
      await prisma.user.update({
        where: { id: ownerId },
        data: { companyId: company.id },
      });
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
