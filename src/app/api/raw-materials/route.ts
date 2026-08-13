import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const materials = await prisma.rawMaterial.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("[RAWMATERIALS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await request.json();
    const { name, unit, description } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
    }

    const material = await prisma.rawMaterial.create({
      data: { name, unit, description, companyId }
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("[RAWMATERIALS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
