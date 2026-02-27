import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// Role hierarchy: who can manage whom
const MANAGEABLE_ROLES: Record<string, string[]> = {
  ADMIN: ["OWNER"],
  OWNER: ["MANAGER"],
  MANAGER: ["SUPERVISOR", "OPERATOR"],
};

// GET: List users managed by the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    const manageableRoles = MANAGEABLE_ROLES[userRole];

    if (!manageableRoles) {
      return NextResponse.json({ error: "You cannot manage users" }, { status: 403 });
    }

    // Get optional role filter from query params
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    const whereClause: any = {};

    if (userRole === "ADMIN") {
      // Admin can see all owners across companies
      whereClause.role = { in: manageableRoles };
    } else {
      // Other roles can only see users within their company
      whereClause.companyId = companyId;
      if (roleFilter && manageableRoles.includes(roleFilter)) {
        whereClause.role = roleFilter;
      } else {
        whereClause.role = { in: manageableRoles };
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST: Create a new user under the current user's management
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    const manageableRoles = MANAGEABLE_ROLES[userRole];

    if (!manageableRoles) {
      return NextResponse.json({ error: "You cannot create users" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, role, section } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate that the user can create this role
    if (!manageableRoles.includes(role)) {
      return NextResponse.json(
        { error: `You cannot create users with role: ${role}` },
        { status: 403 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // For non-admin roles, user must belong to the same company
    if (userRole !== "ADMIN" && !companyId) {
      return NextResponse.json(
        { error: "You must be associated with a company" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role,
        section: role === "SUPERVISOR" ? (section || null) : null,
        companyId: companyId,
        createdById: session.user.id,
      },
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

    return NextResponse.json(
      { message: "User created successfully", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
