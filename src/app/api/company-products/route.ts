import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch all company products (inventory units)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const products = await prisma.companyProduct.findMany({
      where: { companyId },
      include: {
        category: { select: { id: true, name: true } },
        thickness: { select: { id: true, value: true, unit: true } },
        size: { select: { id: true, label: true, length: true, width: true } },
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { thickness: { sortOrder: "asc" } },
        { size: { sortOrder: "asc" } },
      ],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST - Create a company product (Owner only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only owners can add products" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { categoryId, thicknessId, sizeId } = await request.json();

    if (!categoryId || !thicknessId || !sizeId) {
      return NextResponse.json({ error: "Category, thickness, and size required" }, { status: 400 });
    }

    // Check if combo already exists
    const existing = await prisma.companyProduct.findUnique({
      where: { companyId_categoryId_thicknessId_sizeId: { companyId, categoryId, thicknessId, sizeId } },
    });

    if (existing) {
      // Re-activate if it was deactivated
      if (!existing.isActive) {
        const updated = await prisma.companyProduct.update({
          where: { id: existing.id },
          data: { isActive: true },
          include: { category: true, thickness: true, size: true },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: "Product already exists" }, { status: 409 });
    }

    const product = await prisma.companyProduct.create({
      data: { companyId, categoryId, thicknessId, sizeId },
      include: { category: true, thickness: true, size: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PUT - Update stock / toggle active (Manager can update stock, Owner can toggle)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["OWNER", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, openingStock, currentStock, isActive } = await request.json();

    if (!id) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

    const updateData: any = {};
    if (openingStock !== undefined) updateData.openingStock = parseInt(openingStock);
    if (currentStock !== undefined) updateData.currentStock = parseInt(currentStock);
    if (isActive !== undefined && role === "OWNER") updateData.isActive = isActive;

    const product = await prisma.companyProduct.update({
      where: { id },
      data: updateData,
      include: { category: true, thickness: true, size: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE - Remove a company product (Owner only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "OWNER") return NextResponse.json({ error: "Only owners can delete" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Soft delete - just deactivate
    await prisma.companyProduct.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
