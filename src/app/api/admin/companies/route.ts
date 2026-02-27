import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET: List all companies with their owners
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        users: {
          where: { role: "OWNER" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            productionBatches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

// POST: Create a new company with an owner
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyLocation,
      ownerName,
      ownerEmail,
      ownerPassword,
      ownerPhone,
    } = body;

    // Validate required fields
    if (!companyName || !companyEmail || !ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: "Company name, email, owner name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if company email already exists
    const existingCompany = await prisma.company.findUnique({
      where: { email: companyEmail },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "A company with this email already exists" },
        { status: 400 }
      );
    }

    // Check if owner email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create company and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          email: companyEmail,
          phone: companyPhone || null,
          location: companyLocation || "",
        },
      });

      const owner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          phone: ownerPhone || null,
          role: "OWNER",
          companyId: company.id,
          createdById: session.user.id,
        },
      });

      return { company, owner };
    });

    return NextResponse.json(
      {
        message: "Company and owner created successfully",
        company: result.company,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          email: result.owner.email,
          role: result.owner.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
