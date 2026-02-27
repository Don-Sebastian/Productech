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
      { href: "/owner/catalog", label: "Product Catalog", icon: Layers },
      { href: "/owner/managers", label: "Managers", icon: Users },
      { href: "/owner/production", label: "Production", icon: Factory },
      { href: "/owner/inventory", label: "Inventory", icon: Package },
    ],
  },
  MANAGER: {
    label: "Manager",
    color: "from-blue-600 to-cyan-600",
    links: [
      { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
      { href: "/manager/orders", label: "Orders", icon: ShoppingCart },
      { href: "/manager/inventory", label: "Inventory", icon: Package },
      { href: "/manager/approvals", label: "Approve Production", icon: ClipboardCheck },
      { href: "/manager/sections", label: "Sections", icon: Factory },
      { href: "/manager/supervisors", label: "Supervisors", icon: Users },
      { href: "/manager/operators", label: "Operators", icon: Wrench },
    ],
  },
  SUPERVISOR: {
    label: "Supervisor",
    color: "from-amber-600 to-orange-600",
    links: [
      { href: "/supervisor", label: "Dashboard", icon: LayoutDashboard },
      { href: "/supervisor/orders", label: "Orders", icon: ShoppingCart },
      { href: "/supervisor/approvals", label: "Approve Production", icon: ClipboardCheck },
      { href: "/supervisor/production-list", label: "Production List", icon: ListChecks },
    ],
  },
  OPERATOR: {
    label: "Operator",
    color: "from-rose-600 to-pink-600",
    links: [
      { href: "/operator", label: "Dashboard", icon: LayoutDashboard },
      { href: "/operator/production", label: "Daily Production", icon: ClipboardList },
      { href: "/operator/log", label: "Machine Log", icon: Gauge },
    ],
  },
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user as any)?.role || "OPERATOR";
  const config = roleConfigs[role] || roleConfigs.OPERATOR;
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch notification count
  useEffect(() => {
    if (role === "ADMIN") return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUnread(data.filter((n: any) => !n.isRead).length);
        }
      })
      .catch(() => {});

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setUnread(data.filter((n: any) => !n.isRead).length);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const notifPath = `/${role.toLowerCase()}/notifications`;

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
        {config.links.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== `/${role.toLowerCase()}` && pathname.startsWith(link.href));
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? `bg-gradient-to-r ${config.color} text-white shadow-lg`
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"} />
              <span className="flex-1">{link.label}</span>
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
        className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-800 border border-slate-700 rounded-xl text-white shadow-xl"
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
