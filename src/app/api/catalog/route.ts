import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/cache";

// GET - Fetch catalog (categories, thicknesses, sizes) for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const [categories, thicknesses, sizes] = await Promise.all([
      prisma.plywoodCategory.findMany({
        where: { companyId, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.plywoodThickness.findMany({
        where: { companyId, isActive: true },
        orderBy: { value: "asc" },
      }),
      prisma.plywoodSize.findMany({
        where: { companyId, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    let productTimings: any[] = [];
    try {
      productTimings = await prisma.productTiming.findMany({ where: { companyId } });
    } catch (e) {
      console.warn("[CATALOG] Could not fetch productTimings:", e);
    }

    // Cache catalog for 5 minutes — it changes very rarely
    return cachedJson({ categories, thicknesses, sizes, productTimings }, 300);
  } catch (error: any) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json({ error: "Failed to fetch catalog", details: error.message }, { status: 500 });
  }
}

// POST - Create or update catalog items (Owner only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const body = await request.json();
    const { type, action, data } = body;

    if (type === "category") {
      if (action === "create") {
        const category = await prisma.plywoodCategory.create({
          data: {
            name: data.name,
            companyId,
            isActive: true,
            sortOrder: data.sortOrder || 0,
          },
        });
        return NextResponse.json(category);
      }
      if (action === "delete") {
        await prisma.plywoodCategory.update({
          where: { id: data.id },
          data: { isActive: false },
        });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "thickness") {
      if (action === "create") {
        const thickness = await prisma.plywoodThickness.create({
          data: {
            value: parseFloat(data.value),
            companyId,
            isActive: true,
            sortOrder: data.sortOrder || 0,
          },
        });
        return NextResponse.json(thickness);
      }
      if (action === "delete") {
        await prisma.plywoodThickness.update({
          where: { id: data.id },
          data: { isActive: false },
        });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "size") {
      if (action === "create") {
        const size = await prisma.plywoodSize.create({
          data: {
            label: data.label,
            length: parseFloat(data.length),
            width: parseFloat(data.width),
            sqft: parseFloat(data.sqft) || 0,
            companyId,
            isActive: true,
            sortOrder: data.sortOrder || 0,
          },
        });
        return NextResponse.json(size);
      }
      if (action === "delete") {
        await prisma.plywoodSize.update({
          where: { id: data.id },
          data: { isActive: false },
        });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "product") {
      if (action === "create") {
        const product = await prisma.companyProduct.create({
          data: {
            companyId,
            categoryId: data.categoryId,
            thicknessId: data.thicknessId,
            sizeId: data.sizeId,
            openingStock: parseInt(data.openingStock) || 0,
            currentStock: parseInt(data.openingStock) || 0,
            isActive: true,
          },
        });
        return NextResponse.json(product);
      }
      if (action === "toggle") {
        await prisma.companyProduct.update({
          where: { id: data.id },
          data: { isActive: data.isActive },
        });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "timing") {
      if (action === "update") {
        const { categoryId, thicknessId, cookingTime: cook, coolingTime: cool } = data;
        
        console.log("[TIMING] Saving:", { companyId, categoryId, thicknessId, cook, cool });

        try {
          const timing = await prisma.productTiming.upsert({
            where: {
              companyId_categoryId_thicknessId: {
                companyId,
                categoryId,
                thicknessId,
              },
            },
            update: {
              cookingTime: parseFloat(cook) || 0,
              coolingTime: parseFloat(cool) || 0,
            },
            create: {
              companyId,
              categoryId,
              thicknessId,
              cookingTime: parseFloat(cook) || 0,
              coolingTime: parseFloat(cool) || 0,
            },
          });
          console.log("[TIMING] Success:", timing.id);
          return NextResponse.json(timing);
        } catch (dbError: any) {
          console.error("[TIMING] Failed:", dbError.message, dbError.code);
          return NextResponse.json({ 
            error: "Failed to save timing", 
            message: dbError.message,
            code: dbError.code 
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: "Invalid type or action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing catalog:", error);
    return NextResponse.json({ error: "Failed to manage catalog", details: error.message }, { status: 500 });
  }
}
