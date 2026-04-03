import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate credentials manually first for proper error messages
    const user = await prisma.user.findUnique({
      where: { email: email as string },
      include: { company: true, sections: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated. Contact your administrator." },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password as string, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Credentials are valid — now let NextAuth handle the actual sign-in
    // We return success so the client can call signIn() knowing it will succeed
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        sections: user.sections.map((s: any) => s.slug),
      },
    });
  } catch (error) {
    console.error("Login validation error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
