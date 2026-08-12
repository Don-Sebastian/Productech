import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, subYears, format } from "date-fns";
import { cachedJson } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    if (!companyId) {
      return NextResponse.json({ error: "No company" }, { status: 400 });
    }

    if (role !== "OWNER" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    // Get all cooked press entries for this company from the last 5 years
    const cutoffDate = subYears(now, 5);

    const pressEntries = await prisma.pressEntry.findMany({
      where: {
        type: "COOK",
        unloadTime: {
          gte: cutoffDate,
          not: null
        },
        session: {
          companyId: companyId,
          approvalStatus: "MANAGER_APPROVED"
        }
      },
      select: {
        unloadTime: true,
        quantity: true,
        size: {
          select: {
            sqft: true
          }
        },
        loadTime: true
      },
      orderBy: {
        unloadTime: 'asc'
      }
    });

    // Initialize buckets
    const dailyData: Record<string, number> = {};
    const weeklyData: Record<string, number> = {};
    const monthlyData: Record<string, number> = {};
    const yearlyData: Record<string, number> = {};
    
    let totalCookTimeMs = 0;
    let totalCooks = 0;
    
    // Overall totals for efficiency
    let overallSqft = 0;

    // Prefill buckets to ensure empty periods are shown
    for (let i = 14; i >= 0; i--) {
      dailyData[format(startOfDay(subDays(now, i)), 'MMM dd')] = 0;
    }
    for (let i = 11; i >= 0; i--) {
      weeklyData[format(startOfWeek(subWeeks(now, i)), "'Week of' MMM dd")] = 0;
    }
    for (let i = 11; i >= 0; i--) {
      monthlyData[format(startOfMonth(subMonths(now, i)), 'MMM yyyy')] = 0;
    }
    for (let i = 4; i >= 0; i--) {
      yearlyData[format(startOfYear(subYears(now, i)), 'yyyy')] = 0;
    }

    pressEntries.forEach(entry => {
      if (!entry.unloadTime) return;
      
      const sqftProduced = entry.quantity * (entry.size?.sqft || 0);
      const unloadDate = new Date(entry.unloadTime);
      overallSqft += sqftProduced;
      
      // Grouping keys
      const dayKey = format(startOfDay(unloadDate), 'MMM dd');
      const weekKey = format(startOfWeek(unloadDate), "'Week of' MMM dd");
      const monthKey = format(startOfMonth(unloadDate), 'MMM yyyy');
      const yearKey = format(startOfYear(unloadDate), 'yyyy');

      if (dailyData[dayKey] !== undefined) dailyData[dayKey] += sqftProduced;
      if (weeklyData[weekKey] !== undefined) weeklyData[weekKey] += sqftProduced;
      if (monthlyData[monthKey] !== undefined) monthlyData[monthKey] += sqftProduced;
      if (yearlyData[yearKey] !== undefined) yearlyData[yearKey] += sqftProduced;

      // Efficiency calculation
      if (entry.loadTime) {
        totalCookTimeMs += (unloadDate.getTime() - new Date(entry.loadTime).getTime());
        totalCooks++;
      }
    });

    // Formatting for Recharts: [{ name: 'Jan 01', sqft: 1500 }, ...]
    const formatForChart = (dataObj: Record<string, number>) => {
      return Object.entries(dataObj).map(([name, sqft]) => ({ name, sqft: Math.round(sqft * 10) / 10 }));
    };

    const avgCookTimeMinutes = totalCooks > 0 ? (totalCookTimeMs / totalCooks) / (1000 * 60) : 0;

    // We use cachedJson to prevent DB spam, but set revalidation to 10 seconds for "live" feel
    return cachedJson({
      daily: formatForChart(dailyData),
      weekly: formatForChart(weeklyData),
      monthly: formatForChart(monthlyData),
      yearly: formatForChart(yearlyData),
      metrics: {
        totalCooks,
        avgCookTimeMinutes: Math.round(avgCookTimeMinutes * 10) / 10,
        overallSqft: Math.round(overallSqft * 10) / 10
      }
    }, 10);
    
  } catch (error) {
    console.error("[CHART_API_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
