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
      // Direct user notifications
      await prisma.notification.updateMany({
        where: { companyId, userId, isRead: false },
        data: { isRead: true },
      });
      // Role-based notifications: fetch all for role, filter unread in js to avoid array null issues
      const roleNotifs = await prisma.notification.findMany({
        where: { companyId, targetRole: role }
      });
      const unreadRoleNotifs = roleNotifs.filter(n => !(n.readByUsers || []).includes(userId));
      
      for (const notif of unreadRoleNotifs) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: { readByUsers: { set: [...(notif.readByUsers || []), userId] } },
        });
      }
    } else if (notificationIds?.length) {
      // Find the required notifications first
      const notifs = await prisma.notification.findMany({
        where: { id: { in: notificationIds } },
      });
      for (const notif of notifs) {
        if (notif.userId === userId) {
          await prisma.notification.update({ where: { id: notif.id }, data: { isRead: true } });
        } else if (notif.targetRole === role && !(notif.readByUsers || []).includes(userId)) {
          await prisma.notification.update({ 
            where: { id: notif.id }, 
            data: { readByUsers: { set: [...(notif.readByUsers || []), userId] } } 
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
