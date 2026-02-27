import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch product types for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;

    const productTypes = await prisma.productType.findMany({
      where: { companyId },
    });

    return NextResponse.json(productTypes);
  } catch (error) {
    console.error("Error fetching product types:", error);
    return NextResponse.json(
      { error: "Failed to fetch product types" },
      { status: 500 },
    );
  }
}

// POST - Create a new product type
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const { name, thickness, description, standardSize } = await request.json();

    if (!name || thickness === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const productType = await prisma.productType.create({
      data: {
        name,
        thickness: parseFloat(thickness),
        description,
        standardSize,
        companyId,
      },
    });

    return NextResponse.json(productType, { status: 201 });
  } catch (error) {
    console.error("Error creating product type:", error);
    return NextResponse.json(
      { error: "Failed to create product type" },
      { status: 500 },
    );
  }
}
