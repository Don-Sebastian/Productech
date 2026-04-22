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
    const dbNotifs = await prisma.notification.findMany({
      where: {
        companyId,
        OR: [
          { userId },
          { targetRole: role },
        ],
      },
      include: {
        order: { select: { id: true, orderNumber: true, customer: { select: { name: true } }, status: true } },
        productionList: { select: { id: true, listNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Map `isRead` based on if the user ID is in readByUsers (for role-based) or absolute isRead flag
    const notifications = dbNotifs.map((n: any) => {
      let isRead = false;
      if (n.userId === userId) {
        isRead = n.isRead;
      } else if (n.targetRole === role) {
        isRead = (n.readByUsers || []).includes(userId);
      }
      return { ...n, isRead };
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PUT - Mark notifications as read (batched)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationIds, markAllRead } = await request.json();
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    if (markAllRead) {
      // Batch 1: Mark all direct user notifications as read in one query
      await prisma.notification.updateMany({
        where: { companyId, userId, isRead: false },
        data: { isRead: true },
      });

      // Batch 2: For role-based notifications, fetch unread ones and batch update
      const roleNotifs = await prisma.notification.findMany({
        where: { companyId, targetRole: role },
        select: { id: true, readByUsers: true },
      });

      // Filter to only unread, then batch update all at once
      const unreadIds = roleNotifs
        .filter(n => !(n.readByUsers || []).includes(userId))
        .map(n => n.id);

      if (unreadIds.length > 0) {
        // Use a transaction to update all at once instead of individual loops
        await prisma.$transaction(
          unreadIds.map(id => {
            const notif = roleNotifs.find(n => n.id === id)!;
            return prisma.notification.update({
              where: { id },
              data: { readByUsers: { set: [...(notif.readByUsers || []), userId] } },
            });
          })
        );
      }
    } else if (notificationIds?.length) {
      // Batch fetch + batch update
      const notifs = await prisma.notification.findMany({
        where: { id: { in: notificationIds } },
        select: { id: true, userId: true, targetRole: true, readByUsers: true },
      });

      const txOps: any[] = [];
      for (const notif of notifs) {
        if (notif.userId === userId) {
          txOps.push(prisma.notification.update({ where: { id: notif.id }, data: { isRead: true } }));
        } else if (notif.targetRole === role && !(notif.readByUsers || []).includes(userId)) {
          txOps.push(prisma.notification.update({
            where: { id: notif.id },
            data: { readByUsers: { set: [...(notif.readByUsers || []), userId] } },
          }));
        }
      }

      if (txOps.length > 0) await prisma.$transaction(txOps);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
