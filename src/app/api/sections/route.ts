import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch sections for the company
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const sections = await prisma.section.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(sections);
  } catch (e) {
    console.error("Error fetching sections:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Create a new section
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "MANAGER" && role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = (session.user as any).companyId;

    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const slug = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

    // Check if slug exists
    const existing = await prisma.section.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });
    if (existing) return NextResponse.json({ error: "Section already exists" }, { status: 400 });

    const count = await prisma.section.count({ where: { companyId } });
    const section = await prisma.section.create({
      data: { name, slug, companyId, sortOrder: count + 1 },
    });
    return NextResponse.json(section);
  } catch (e) {
    console.error("Error creating section:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: Deactivate a section
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "MANAGER" && role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.section.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Error deleting section:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
