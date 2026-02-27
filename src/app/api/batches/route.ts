import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch all production batches for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;
    const section = (session.user as any).section;

    if (!companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const whereClause: any = { companyId };

    // Supervisors only see batches from their section
    if (role === "SUPERVISOR" && section) {
      whereClause.section = section;
    }

    const batches = await prisma.productionBatch.findMany({
      where: whereClause,
      include: {
        productType: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        batchMaterials: { include: { material: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 },
    );
  }
}

// POST - Create a new production batch
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    // Only supervisors, managers, and owners can create batches
    if (!["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized to create batches" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;

    const { batchNumber, productTypeId, quantity, startDate, materials, section, status, defectiveUnits, notes } =
      await request.json();

    // Validate required fields
    if (!batchNumber || !productTypeId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber,
        productTypeId,
        quantity: parseInt(quantity),
        startDate: new Date(startDate || new Date()),
        companyId,
        assignedToId: userId,
        section: section || null,
        status: status || "INITIATED",
        defectiveUnits: parseInt(defectiveUnits) || 0,
        notes: notes || null,
        batchMaterials: {
          create:
            materials?.map((m: any) => ({
              materialId: m.materialId,
              quantity: m.quantity,
            })) || [],
        },
      },
      include: {
        productType: true,
        assignedTo: true,
        batchMaterials: { include: { material: true } },
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 },
    );
  }
}
