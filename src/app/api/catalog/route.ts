import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    return NextResponse.json({ categories, thicknesses, sizes });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}

// POST - Create or update catalog items (Owner only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only owners can manage catalog" }, { status: 403 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { type, action, data } = await request.json();

    // type: "category" | "thickness" | "size"
    // action: "create" | "toggle" | "delete"
    // data: the item data

    if (type === "category") {
      if (action === "create") {
        const cat = await prisma.plywoodCategory.create({
          data: { name: data.name, companyId, sortOrder: data.sortOrder || 0 },
        });
        return NextResponse.json(cat, { status: 201 });
      }
      if (action === "toggle") {
        const cat = await prisma.plywoodCategory.update({
          where: { id: data.id },
          data: { isActive: data.isActive },
        });
        return NextResponse.json(cat);
      }
      if (action === "delete") {
        await prisma.plywoodCategory.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "thickness") {
      if (action === "create") {
        const th = await prisma.plywoodThickness.create({
          data: { value: parseFloat(data.value), companyId, sortOrder: data.sortOrder || 0 },
        });
        return NextResponse.json(th, { status: 201 });
      }
      if (action === "toggle") {
        const th = await prisma.plywoodThickness.update({
          where: { id: data.id },
          data: { isActive: data.isActive },
        });
        return NextResponse.json(th);
      }
      if (action === "delete") {
        await prisma.plywoodThickness.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "size") {
      if (action === "create") {
        const sz = await prisma.plywoodSize.create({
          data: {
            label: data.label,
            length: parseFloat(data.length),
            width: parseFloat(data.width),
            companyId,
            sortOrder: data.sortOrder || 0,
          },
        });
        return NextResponse.json(sz, { status: 201 });
      }
      if (action === "toggle") {
        const sz = await prisma.plywoodSize.update({
          where: { id: data.id },
          data: { isActive: data.isActive },
        });
        return NextResponse.json(sz);
      }
      if (action === "delete") {
        await prisma.plywoodSize.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid type or action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing catalog:", error);
    return NextResponse.json({ error: "Failed to manage catalog" }, { status: 500 });
  }
}
