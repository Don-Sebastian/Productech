import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: List all peeling materials for the company
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const materials = await (prisma as any).peelingMaterial.findMany({
      where: { companyId },
      orderBy: [{ treeType: "asc" }, { veneerThickness: "asc" }],
    });

    return NextResponse.json(materials);
  } catch (e) {
    console.error("Peeling catalog GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Add a new peeling material
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "MANAGER" && role !== "OWNER") {
      return NextResponse.json({ error: "Only managers can manage peeling catalog" }, { status: 403 });
    }
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await req.json();
    const { treeType, veneerThickness } = body;

    if (!treeType || !veneerThickness) {
      return NextResponse.json({ error: "Tree type and veneer thickness are required" }, { status: 400 });
    }

    const material = await (prisma as any).peelingMaterial.create({
      data: {
        treeType: treeType.trim(),
        veneerThickness: parseFloat(veneerThickness),
        companyId,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "This tree type + thickness combination already exists" }, { status: 409 });
    }
    console.error("Peeling catalog POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: Remove a peeling material
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "MANAGER" && role !== "OWNER") {
      return NextResponse.json({ error: "Only managers can manage peeling catalog" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await (prisma as any).peelingMaterial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Peeling catalog DELETE error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
