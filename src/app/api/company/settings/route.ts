import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getCompanyId(sessionUser: any): Promise<string | null> {
  if (sessionUser?.companyId) return sessionUser.companyId;
  if (sessionUser?.ownedCompanies?.length > 0) return sessionUser.ownedCompanies[0].id;
  if (sessionUser?.id) {
    const comp = await prisma.company.findFirst({
      where: { ownerId: sessionUser.id },
      select: { id: true },
    });
    if (comp) return comp.id;
  }
  return null;
}

// GET - Fetch company production settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = await getCompanyId(session.user);
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    const settings = {
      workingHoursPerDay: (company as any)?.workingHoursPerDay ?? 8,
      numHotPresses: (company as any)?.numHotPresses ?? 1,
      pressCapacityPerPress: (company as any)?.pressCapacityPerPress ?? 10,
      costingPreference: (company as any)?.costingPreference ?? "BOTH",
    };
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Error fetching company settings:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT - Update company production settings (Manager/Owner only)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "MANAGER" && role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = await getCompanyId(session.user);
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const { workingHoursPerDay, numHotPresses, pressCapacityPerPress, costingPreference } = await req.json();

    const updateData: any = {};
    if (workingHoursPerDay !== undefined) updateData.workingHoursPerDay = parseFloat(workingHoursPerDay);
    if (numHotPresses !== undefined) updateData.numHotPresses = parseInt(numHotPresses);
    if (pressCapacityPerPress !== undefined) updateData.pressCapacityPerPress = parseInt(pressCapacityPerPress);
    if (costingPreference !== undefined) updateData.costingPreference = costingPreference;

    const updatedCompany = await prisma.company.update({ where: { id: companyId }, data: updateData });
    return NextResponse.json({
      workingHoursPerDay: updatedCompany.workingHoursPerDay,
      numHotPresses: updatedCompany.numHotPresses,
      pressCapacityPerPress: updatedCompany.pressCapacityPerPress,
      costingPreference: updatedCompany.costingPreference,
    });
  } catch (e) {
    console.error("Error updating company settings:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
