import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Get current glue stock + recent logs
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    if (role !== "MANAGER" && role !== "OWNER") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const glueStock = await (prisma as any).glueStock.findUnique({
      where: { companyId },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    // Also get the company threshold
    const company = await (prisma as any).company.findUnique({
      where: { id: companyId },
      select: { glueAlertThresholdKg: true },
    });

    return NextResponse.json({
      stock: glueStock,
      thresholdKg: company?.glueAlertThresholdKg || 1000,
    });
  } catch (e) {
    console.error("GlueStock GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Add stock, set opening stock, or update threshold
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    if (role !== "MANAGER") {
      return NextResponse.json({ error: "Only managers can manage glue stock" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      // Set opening stock (creates GlueStock if not exists)
      case "setOpening": {
        const { quantityKg } = body;
        if (!quantityKg || quantityKg <= 0) {
          return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
        }

        const existing = await (prisma as any).glueStock.findUnique({ where: { companyId } });

        if (existing) {
          // Update opening and current
          await (prisma as any).glueStock.update({
            where: { companyId },
            data: { openingKg: quantityKg, currentKg: quantityKg },
          });
          await (prisma as any).glueStockLog.create({
            data: {
              type: "OPENING",
              quantityKg: quantityKg,
              balanceKg: quantityKg,
              notes: `Opening stock set to ${quantityKg} kg`,
              glueStock: { connect: { id: existing.id } },
              userId,
            },
          });
          const updated = await (prisma as any).glueStock.findUnique({
            where: { companyId },
            include: { logs: { orderBy: { createdAt: "desc" }, take: 50 } },
          });
          return NextResponse.json(updated);
        } else {
          const created = await (prisma as any).glueStock.create({
            data: {
              companyId,
              openingKg: quantityKg,
              currentKg: quantityKg,
              logs: {
                create: {
                  type: "OPENING",
                  quantityKg: quantityKg,
                  balanceKg: quantityKg,
                  notes: `Opening stock set to ${quantityKg} kg`,
                  userId,
                },
              },
            },
            include: { logs: { orderBy: { createdAt: "desc" }, take: 50 } },
          });
          return NextResponse.json(created);
        }
      }

      // Add stock (top up)
      case "addStock": {
        const { quantityKg, notes } = body;
        if (!quantityKg || quantityKg <= 0) {
          return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
        }

        const stock = await (prisma as any).glueStock.findUnique({ where: { companyId } });
        if (!stock) {
          return NextResponse.json({ error: "Set opening stock first" }, { status: 400 });
        }

        const newBalance = stock.currentKg + quantityKg;
        await (prisma as any).glueStock.update({
          where: { companyId },
          data: { currentKg: newBalance },
        });
        await (prisma as any).glueStockLog.create({
          data: {
            type: "ADD",
            quantityKg: quantityKg,
            balanceKg: newBalance,
            notes: notes || `Added ${quantityKg} kg of glue`,
            glueStock: { connect: { id: stock.id } },
            userId,
          },
        });
        const updated = await (prisma as any).glueStock.findUnique({
          where: { companyId },
          include: { logs: { orderBy: { createdAt: "desc" }, take: 50 } },
        });
        return NextResponse.json(updated);
      }

      // Adjust stock (manual correction)
      case "adjust": {
        const { newQuantityKg, notes } = body;
        if (newQuantityKg === undefined || newQuantityKg < 0) {
          return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
        }

        const stock = await (prisma as any).glueStock.findUnique({ where: { companyId } });
        if (!stock) {
          return NextResponse.json({ error: "Set opening stock first" }, { status: 400 });
        }

        const diff = newQuantityKg - stock.currentKg;
        await (prisma as any).glueStock.update({
          where: { companyId },
          data: { currentKg: newQuantityKg },
        });
        await (prisma as any).glueStockLog.create({
          data: {
            type: "ADJUSTMENT",
            quantityKg: diff,
            balanceKg: newQuantityKg,
            notes: notes || `Manual adjustment: ${stock.currentKg} kg → ${newQuantityKg} kg`,
            glueStock: { connect: { id: stock.id } },
            userId,
          },
        });
        const updated = await (prisma as any).glueStock.findUnique({
          where: { companyId },
          include: { logs: { orderBy: { createdAt: "desc" }, take: 50 } },
        });
        return NextResponse.json(updated);
      }

      // Update alert threshold
      case "setThreshold": {
        const { thresholdKg } = body;
        if (thresholdKg === undefined || thresholdKg < 0) {
          return NextResponse.json({ error: "Invalid threshold" }, { status: 400 });
        }
        await (prisma as any).company.update({
          where: { id: companyId },
          data: { glueAlertThresholdKg: thresholdKg },
        });
        return NextResponse.json({ success: true, thresholdKg });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("GlueStock POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
