import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const PREDEFINED_SECTIONS = [
  { name: "HOT PRESS", slug: "hotpress", sortOrder: 1, isPredefined: true },
  { name: "PEELING", slug: "peeling", sortOrder: 2, isPredefined: true },
  { name: "DRYER", slug: "dryer", sortOrder: 3, isPredefined: true },
  { name: "FINISHING", slug: "finishing", sortOrder: 4, isPredefined: true },
];

// GET: Fetch sections - auto-seeds predefined ones if missing
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    // Auto-seed the 4 mandatory sections if they don't exist
    await Promise.all(
      PREDEFINED_SECTIONS.map((s) =>
        prisma.section.upsert({
          where: { companyId_slug: { companyId, slug: s.slug } },
          update: {}, // don't overwrite existing data
          create: { name: s.name, slug: s.slug, companyId, sortOrder: s.sortOrder },
        })
      )
    );

    const sections = await prisma.section.findMany({
      where: { companyId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    
    // Filter to only return the core sections we care about for machinery
    const cores = sections.filter(s => PREDEFINED_SECTIONS.some(p => p.slug === s.slug));
    
    // Attach isPredefined flag for frontend use
    const withFlag = cores.map((s) => ({
      ...s,
      isPredefined: true,
    }));
    return NextResponse.json(withFlag);
  } catch (e) {
    console.error("Error fetching sections:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


// POST: Disabled - Core sections are mandatory and fixed
export async function POST() {
  return NextResponse.json({ error: "Custom sections are no longer supported. Please manage machinery under core factory sections." }, { status: 403 });
}

// DELETE: Disabled - Predefined sections cannot be removed
export async function DELETE() {
  return NextResponse.json({ error: "Predefined factory sections cannot be removed." }, { status: 403 });
}
