import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Unified Machine Production Log API
// Aggregates HotPress, Peeling, Dryer, and Finishing sessions for supervisors/managers/owners
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    // Only supervisor, manager, owner can access
    if (!["SUPERVISOR", "MANAGER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "all"; // all | hotpress | peeling | dryer | finishing
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const operatorParam = searchParams.get("operator");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 30;

    // Build date filter
    const dateFilter: any = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      dateFilter.gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }

    // Build operator filter
    const operatorFilter = operatorParam && operatorParam !== "ALL" ? operatorParam : undefined;

    // ============ Fetch from each section in parallel ============
    const results: any[] = [];
    let totalCount = 0;

    const sections = section === "all" 
      ? ["hotpress", "peeling", "dryer", "finishing"] 
      : [section];

    // For "all" sections, we fetch a limited set from each then merge & sort.
    // For a specific section, we paginate properly.
    if (section !== "all") {
      // Single section: proper pagination
      const { items, count } = await fetchSection(
        section, companyId, dateFilter, operatorFilter, page, pageSize
      );
      results.push(...items);
      totalCount = count;
    } else {
      // All sections: fetch concurrently, merge, and paginate client-side
      // We fetch a larger window to sort across sections
      const fetchSize = pageSize * 2; // fetch more to allow cross-section sorting
      const allFetches = await Promise.all(
        sections.map(s => fetchSection(s, companyId, dateFilter, operatorFilter, 1, fetchSize))
      );

      const merged: any[] = [];
      let totalAcross = 0;
      for (const f of allFetches) {
        merged.push(...f.items);
        totalAcross += f.count;
      }

      // Sort merged by shiftDate desc
      merged.sort((a, b) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime());

      // Paginate the merged result
      const start = (page - 1) * pageSize;
      results.push(...merged.slice(start, start + pageSize));
      totalCount = totalAcross;
    }

    // Fetch operators list for the filter dropdown (single query)
    const operators = await prisma.user.findMany({
      where: { companyId, role: "OPERATOR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Fetch sections/machines for filter dropdown
    const machines = await prisma.machine.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, code: true, section: { select: { name: true, slug: true } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      logs: results,
      operators,
      machines,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (e) {
    console.error("Machine Log GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ============ Section-specific fetch functions ============

async function fetchSection(
  section: string,
  companyId: string,
  dateFilter: any,
  operatorFilter: string | undefined,
  page: number,
  pageSize: number
): Promise<{ items: any[]; count: number }> {
  switch (section) {
    case "hotpress":
      return fetchHotPress(companyId, dateFilter, operatorFilter, page, pageSize);
    case "peeling":
      return fetchPeeling(companyId, dateFilter, operatorFilter, page, pageSize);
    case "dryer":
      return fetchDryer(companyId, dateFilter, operatorFilter, page, pageSize);
    case "finishing":
      return fetchFinishing(companyId, dateFilter, operatorFilter, page, pageSize);
    default:
      return { items: [], count: 0 };
  }
}

async function fetchHotPress(
  companyId: string,
  dateFilter: any,
  operatorFilter: string | undefined,
  page: number,
  pageSize: number
) {
  const where: any = { companyId, status: "STOPPED" };
  if (Object.keys(dateFilter).length > 0) where.shiftDate = dateFilter;
  if (operatorFilter) where.operatorId = operatorFilter;

  const [sessions, count] = await Promise.all([
    prisma.hotPressSession.findMany({
      where,
      select: {
        id: true,
        status: true,
        startTime: true,
        stopTime: true,
        shiftDate: true,
        numDaylights: true,
        approvalStatus: true,
        operator: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true, code: true } },
        entries: {
          where: { unloadTime: { not: null } },
          select: {
            id: true,
            type: true,
            loadTime: true,
            unloadTime: true,
            quantity: true,
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true, length: true, width: true, sqft: true } },
          },
        },
        glueEntries: { select: { barrels: true } },
        pauseEvents: { select: { type: true, startTime: true, endTime: true } },
      },
      orderBy: { shiftDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.hotPressSession.count({ where }),
  ]);

  return {
    items: sessions.map(s => ({
      ...s,
      section: "hotpress",
      sectionLabel: "Hot Press",
      // Pre-compute summary stats for the card
      totalSheets: s.entries.filter(e => e.type === "COOK").reduce((a, e) => a + e.quantity, 0),
      totalCooks: s.entries.filter(e => e.type === "COOK").length,
      totalRepresses: s.entries.filter(e => e.type === "REPRESS").length,
      totalGlue: s.glueEntries.reduce((a, g) => a + g.barrels, 0),
      totalSqft: s.entries.filter(e => e.type === "COOK").reduce((a, e) => a + e.quantity * (e.size?.sqft || 0), 0),
    })),
    count,
  };
}

async function fetchPeeling(
  companyId: string,
  dateFilter: any,
  operatorFilter: string | undefined,
  page: number,
  pageSize: number
) {
  const where: any = { companyId, status: "STOPPED" };
  if (Object.keys(dateFilter).length > 0) where.shiftDate = dateFilter;
  if (operatorFilter) where.operatorId = operatorFilter;

  const [sessions, count] = await Promise.all([
    (prisma as any).peelingSession.findMany({
      where,
      select: {
        id: true,
        status: true,
        startTime: true,
        stopTime: true,
        shiftDate: true,
        operator: { select: { id: true, name: true } },
        entries: {
          select: {
            id: true,
            quantity: true,
            logCount: true,
            timestamp: true,
            peelingMaterial: { select: { treeType: true, veneerThickness: true } },
          },
        },
        pauseEvents: { select: { type: true, startTime: true, endTime: true } },
      },
      orderBy: { shiftDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    (prisma as any).peelingSession.count({ where }),
  ]);

  return {
    items: sessions.map((s: any) => ({
      ...s,
      section: "peeling",
      sectionLabel: "Peeling",
      totalSheets: s.entries.reduce((a: number, e: any) => a + e.quantity, 0),
      totalLogs: s.entries.reduce((a: number, e: any) => a + e.logCount, 0),
    })),
    count,
  };
}

async function fetchDryer(
  companyId: string,
  dateFilter: any,
  operatorFilter: string | undefined,
  page: number,
  pageSize: number
) {
  const where: any = { companyId, status: "STOPPED" };
  if (Object.keys(dateFilter).length > 0) where.shiftDate = dateFilter;
  if (operatorFilter) where.operatorId = operatorFilter;

  const [sessions, count] = await Promise.all([
    (prisma as any).dryerSession.findMany({
      where,
      select: {
        id: true,
        status: true,
        startTime: true,
        stopTime: true,
        shiftDate: true,
        operator: { select: { id: true, name: true } },
        batches: {
          select: {
            id: true,
            veneerThickness: true,
            loadTime: true,
            unloadTime: true,
            quantity: true,
          },
        },
        checks: {
          select: {
            id: true,
            beltSpeed: true,
            dryerTemp: true,
            boilerTemp: true,
            timestamp: true,
          },
        },
        pauseEvents: { select: { type: true, startTime: true, endTime: true } },
      },
      orderBy: { shiftDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    (prisma as any).dryerSession.count({ where }),
  ]);

  return {
    items: sessions.map((s: any) => ({
      ...s,
      section: "dryer",
      sectionLabel: "Dryer",
      totalBatches: s.batches.length,
      totalSheets: s.batches.reduce((a: number, b: any) => a + b.quantity, 0),
      totalChecks: s.checks.length,
    })),
    count,
  };
}

async function fetchFinishing(
  companyId: string,
  dateFilter: any,
  operatorFilter: string | undefined,
  page: number,
  pageSize: number
) {
  const where: any = { companyId };
  if (Object.keys(dateFilter).length > 0) where.shiftDate = dateFilter;
  if (operatorFilter) where.operatorId = operatorFilter;

  const [logs, count] = await Promise.all([
    (prisma as any).finishingLog.findMany({
      where,
      select: {
        id: true,
        shiftDate: true,
        createdAt: true,
        operator: { select: { id: true, name: true } },
        entries: {
          select: {
            id: true,
            quantity: true,
            timestamp: true,
            category: { select: { name: true } },
            thickness: { select: { value: true } },
            size: { select: { label: true, length: true, width: true } },
          },
        },
      },
      orderBy: { shiftDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    (prisma as any).finishingLog.count({ where }),
  ]);

  return {
    items: logs.map((l: any) => ({
      ...l,
      section: "finishing",
      sectionLabel: "Finishing",
      startTime: l.createdAt,
      stopTime: null,
      totalSheets: l.entries.reduce((a: number, e: any) => a + e.quantity, 0),
      totalEntries: l.entries.length,
    })),
    count,
  };
}
