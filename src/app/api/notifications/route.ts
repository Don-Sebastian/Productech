import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    if (!companyId) return NextResponse.json([]);

    // Get notifications targeted at this user OR at their role
    const notifications = await prisma.notification.findMany({
      where: {
        companyId,
        OR: [
          { userId },
          { targetRole: role },
        ],
      },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true, status: true } },
        productionList: { select: { id: true, listNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationIds, markAllRead } = await request.json();
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          companyId,
          isRead: false,
          OR: [
            { userId },
            { targetRole: role },
          ],
        },
        data: { isRead: true },
      });
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
