"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Factory,
  Package,
  LogOut,
  ChevronRight,
  Gauge,
  Wrench,
  ClipboardList,
  ShoppingCart,
  Bell,
  Layers,
  Menu,
  X,
  ListChecks,
  ClipboardCheck,
  History,
  Settings,
  Truck,
  UserCheck,
  Banknote,
} from "lucide-react";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const roleConfigs: Record<string, { label: string; color: string; links: { href: string; label: string; icon: any }[] }> = {
  ADMIN: {
    label: "Platform Admin",
    color: "from-violet-600 to-indigo-600",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/companies", label: "Companies", icon: Building2 },
    ],
  },
  OWNER: {
    label: "Company Owner",
    color: "from-emerald-600 to-teal-600",
    links: [
      { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
      { href: "/owner/log-history", label: "Log History", icon: History },
      { href: "/owner/inventory", label: "Inventory", icon: Package },
      { href: "/owner/production", label: "Production", icon: Factory },
      { href: "/owner/orders", label: "Order History", icon: ShoppingCart },
      // { href: "/owner/approvals", label: "Approve Production", icon: ClipboardCheck },
      { href: "/owner/dispatch-history", label: "Dispatch History", icon: Truck },
      { href: "/owner/managers", label: "Managers", icon: Users },
      { href: "/owner/employees", label: "Employees", icon: Users },
      { href: "/owner/attendance", label: "Attendance View", icon: UserCheck },
      { href: "/owner/expenses", label: "Salary Expenses", icon: Banknote },
    ],
  },
  MANAGER: {
    label: "Manager",
    color: "from-blue-600 to-cyan-600",
    links: [
      { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
      { href: "/manager/orders", label: "Orders", icon: ShoppingCart },
      { href: "/manager/production", label: "Production Lists", icon: ListChecks },
      { href: "/manager/inventory", label: "Inventory", icon: Package },
      { href: "/manager/approvals", label: "Approve Production", icon: ClipboardCheck },
      { href: "/manager/attendance", label: "Attendance Approvals", icon: UserCheck },
      { href: "/manager/dispatch", label: "Dispatch", icon: Truck },
      { href: "/manager/employees", label: "Employee Log", icon: Users },
      { href: "/manager/log-history", label: "Log History", icon: History },
      { href: "/manager/settings", label: "Settings", icon: Settings },
    ],
  },
  SUPERVISOR: {
    label: "Supervisor",
    color: "from-amber-600 to-orange-600",
    links: [
      { href: "/supervisor", label: "Dashboard", icon: LayoutDashboard },
      { href: "/supervisor/orders", label: "Orders", icon: ShoppingCart },
      { href: "/supervisor/approvals", label: "Approve Production", icon: ClipboardCheck },
      { href: "/supervisor/attendance", label: "Mark Attendance", icon: UserCheck },
      { href: "/supervisor/production-list", label: "Production List", icon: ListChecks },
      { href: "/supervisor/employees", label: "My Workers", icon: Users },
      { href: "/supervisor/dispatch", label: "Dispatch", icon: Truck },
      { href: "/supervisor/log-history", label: "Log History", icon: History },
    ],
  },
  OPERATOR: {
    label: "Operator",
    color: "from-rose-600 to-pink-600",
    links: [
      { href: "/operator", label: "Dashboard", icon: LayoutDashboard },
      { href: "/operator/log", label: "Machine Log", icon: Gauge },
      { href: "/operator/history", label: "Log History", icon: History },
    ],
  },
};

const sectionNavLinks: Record<string, { href: string; label: string; icon: any }[]> = {
  hotpress: [
    { href: "/operator/hotpress/log", label: "Machine Log", icon: Gauge },
    { href: "/operator/hotpress/production", label: "Production List", icon: ClipboardList },
    { href: "/operator/hotpress/history", label: "Log History", icon: History },
  ],
  peeling: [
    { href: "/operator/peeling/log", label: "Dashboard", icon: LayoutDashboard },
  ],
  dryer: [
    { href: "/operator/dryer/log", label: "Dashboard", icon: LayoutDashboard },
  ],
  finishing: [
    { href: "/operator/finishing/log", label: "Dashboard", icon: LayoutDashboard },
  ],
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user as any)?.role || "OPERATOR";
  const config = roleConfigs[role] || roleConfigs.OPERATOR;
  const [unread, setUnread] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [operatorSection, setOperatorSection] = useState<string | null>(null);

  // Fetch operator's machine section for dynamic nav
  useEffect(() => {
    if (role !== "OPERATOR") return;
    fetch("/api/operator/assignment")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.machine?.section?.slug) {
          setOperatorSection(data.machine.section.slug);
        }
      })
      .catch(() => {});
  }, [role]);

  // Fetch notification count
  useEffect(() => {
    if (role === "ADMIN") return;
    const updateNotifs = (data: any) => {
      if (Array.isArray(data)) {
        const unreadArr = data.filter((n: any) => !n.isRead);
        setUnread(unreadArr.length);
        setUnreadNotifs(unreadArr);
      }
    };

    fetch("/api/notifications").then((r) => r.json()).then(updateNotifs).catch(() => {});

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetch("/api/notifications").then((r) => r.json()).then(updateNotifs).catch(() => {});
    }, 30000);

    const handleReadEvent = () => {
      fetch("/api/notifications").then((r) => r.json()).then(updateNotifs).catch(() => {});
    };
    window.addEventListener("notifications_read", handleReadEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_read", handleReadEvent);
    };
  }, [role]);

  const navLinks = role === "OPERATOR" && operatorSection
    ? (sectionNavLinks[operatorSection] || config.links)
    : config.links;

  const notifPath = role === "OPERATOR" && operatorSection
    ? `/operator/${operatorSection}/notification`
    : `/${role.toLowerCase()}/notifications`;

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">CRPLY</h1>
            <p className="text-slate-500 text-xs">{config.label}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== `/${role.toLowerCase()}` && pathname.startsWith(link.href));
          const Icon = link.icon;

          // Check if this link should be highlighted based on unread notifications
          const matchedNotifs = unreadNotifs.filter(n => {
            const t = n.type || "";
            if (link.href.includes("/orders") && t.includes("ORDER")) return true;
            if (link.href.includes("/production") && (t.includes("PRODUCTION") || t.includes("LIST"))) return true;
            if (link.href.includes("/approvals") && t.includes("COMPLETION")) return true;
            if (link.href.includes("/dispatch") && (t.includes("DISPATCH") || t.includes("READY"))) return true;
            if (link.href.includes("/history") && t.includes("LOG")) return true;
            return false;
          });
          const isHighlighted = !isActive && matchedNotifs.length > 0;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                setMobileOpen(false);
                if (matchedNotifs.length > 0) {
                  const ids = matchedNotifs.map((n) => n.id);
                  fetch("/api/notifications", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notificationIds: ids }),
                  });
                  setUnreadNotifs((prev) => prev.filter((n) => !ids.includes(n.id)));
                  setUnread((prev) => prev - ids.length);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"} />
              <span className="flex-1">{link.label}</span>
              {isHighlighted && (
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 animate-pulse">Action</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
              )}
              {isActive && <ChevronRight size={14} className="text-white/50" />}
            </Link>
          );
        })}

        {/* Notifications link (all roles except admin) */}
        {role !== "ADMIN" && (
          <Link
            href={notifPath}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
              pathname === notifPath
                ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Bell size={18} className={pathname === notifPath ? "text-white" : "text-slate-500 group-hover:text-slate-300"} />
            <span className="flex-1">Notifications</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center animate-pulse">
                {unread}
              </span>
            )}
          </Link>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-semibold text-sm`}>
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-4 left-4 z-[60] p-2 bg-slate-800 border border-slate-700 rounded-xl text-white shadow-xl"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        {sidebarContent}
      </aside>
    </>
  );
}
