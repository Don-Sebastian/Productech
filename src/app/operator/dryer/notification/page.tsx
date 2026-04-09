"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Bell, BellOff, Check, Package, ListChecks, AlertTriangle, Clock } from "lucide-react";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotifications(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (status === "authenticated") fetchNotifications(); }, [status]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [id] }),
    });
    fetchNotifications();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    NEW_ORDER: { icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
    ORDER_UPDATED: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
    ORDER_CANCELLED: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
    PRODUCTION_LIST: { icon: ListChecks, color: "text-violet-400", bg: "bg-violet-500/10" },
  };

  const priorityBadge: Record<string, string> = {
    LOW: "bg-slate-500/20 text-slate-300",
    NORMAL: "bg-blue-500/20 text-blue-300",
    HIGH: "bg-amber-500/20 text-amber-300",
    URGENT: "bg-red-500/20 text-red-300 animate-pulse",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Bell size={28} /> Notifications
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-4 py-2.5 bg-blue-600/20 text-blue-300 font-semibold rounded-xl text-sm hover:bg-blue-600/30 active:scale-[0.97] transition flex items-center gap-2">
              <Check size={16} /> Mark All Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <BellOff size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const tc = typeConfig[n.type] || typeConfig.NEW_ORDER;
              const Icon = tc.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`bg-slate-800/40 border rounded-2xl p-4 transition-all cursor-pointer active:scale-[0.99] ${
                    n.isRead ? "border-slate-700/30 opacity-60" : "border-slate-600/50 hover:border-slate-500/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${tc.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={18} className={tc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-bold text-sm">{n.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadge[n.priority]}`}>{n.priority}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-slate-400 text-sm">{n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={12} className="text-slate-500" />
                        <span className="text-xs text-slate-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                        {n.order && (
                          <span className="text-xs text-blue-400 ml-2">{n.order.orderNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
