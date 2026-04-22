"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Factory, Users, Wrench, Settings2, Flame, Cog, TreePine, LayoutTemplate, Clock, FolderTree } from "lucide-react";

export default function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/manager/settings/catalog", label: "Product Catalog", icon: Layers },
    { href: "/manager/settings/peeling-catalog", label: "Peeling Catalog", icon: TreePine },
    { href: "/manager/settings/production", label: "Hot Press", icon: Flame },
    { href: "/manager/settings/machinery", label: "Departments", icon: Cog },
    // { href: "/manager/settings/sections", label: "Departments", icon: FolderTree },
    { href: "/manager/settings/sub-departments", label: "Sections", icon: LayoutTemplate },
    { href: "/manager/settings/shifts", label: "Shifts", icon: Clock },
    { href: "/manager/settings/supervisors", label: "Supervisors", icon: Users },
    { href: "/manager/settings/operators", label: "Operators", icon: Wrench },
    { href: "/manager/settings/customizations", label: "Order Customizations", icon: Settings2 },
  ];


  return (
    <>
      <div className="w-56 border-r border-slate-800 p-4 shrink-0 overflow-y-auto hidden md:block bg-slate-900/80">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md border border-slate-700 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon size={18} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Mobile Nav */}
      <div className="md:hidden border-b border-slate-800 p-4 bg-slate-900 overflow-x-auto whitespace-nowrap">
        <nav className="flex gap-2">
            {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-md border border-slate-700"
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
