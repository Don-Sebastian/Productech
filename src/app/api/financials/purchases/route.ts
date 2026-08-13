import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const purchases = await prisma.rawMaterialPurchase.findMany({
      where: { companyId },
      include: {
        material: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { purchaseDate: 'desc' }
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("[PURCHASES_GET_ERROR]", error);
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
    const { materialId, quantity, unitPrice, notes, purchaseDate } = body;

    if (!materialId || !quantity || !unitPrice) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const totalCost = parseFloat(quantity) * parseFloat(unitPrice);

    const purchase = await prisma.rawMaterialPurchase.create({
      data: {
        materialId,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        totalCost,
        notes,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        companyId,
        createdById: session.user.id
      },
      include: {
        material: true,
        createdBy: { select: { name: true } }
      }
    });

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("[PURCHASES_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
