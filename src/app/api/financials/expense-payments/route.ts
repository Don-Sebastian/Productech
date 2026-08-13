import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

    const searchParams = request.nextUrl.searchParams;
    const expenseId = searchParams.get("expenseId");

    const whereClause: any = { companyId };
    if (expenseId) whereClause.expenseId = expenseId;

    const payments = await prisma.expensePayment.findMany({
      where: whereClause,
      include: {
        expense: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("[EXPENSE_PAYMENTS_GET_ERROR]", error);
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
    const { expenseId, amount, notes, paymentDate } = body;

    if (!expenseId || !amount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const payment = await prisma.expensePayment.create({
      data: {
        expenseId,
        amount: parseFloat(amount),
        notes,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        companyId,
        createdById: session.user.id
      },
      include: {
        expense: true,
        createdBy: { select: { name: true } }
      }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("[EXPENSE_PAYMENTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
