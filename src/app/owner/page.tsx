"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Factory,
  Package,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export default function OwnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data.stats);
          setRecentBatches(data.recentBatches || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Batches", value: stats?.totalBatches || 0, icon: Factory, color: "emerald", change: "+12%" },
    { label: "Completed", value: stats?.completedBatches || 0, icon: CheckCircle, color: "blue", change: "+8%" },
    { label: "In Progress", value: stats?.inProgressBatches || 0, icon: Clock, color: "amber", change: "Active" },
    { label: "Total Stock", value: stats?.totalStock || 0, icon: Package, color: "violet", change: "Units" },
  ];

  const teamCards = [
    { label: "Managers", value: stats?.totalManagers || 0, color: "blue" },
    { label: "Supervisors", value: stats?.totalSupervisors || 0, color: "amber" },
    { label: "Operators", value: stats?.totalOperators || 0, color: "rose" },
  ];

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: "hover:border-emerald-500/30", text: "text-emerald-400", iconBg: "bg-emerald-500/10" },
    blue: { bg: "hover:border-blue-500/30", text: "text-blue-400", iconBg: "bg-blue-500/10" },
    amber: { bg: "hover:border-amber-500/30", text: "text-amber-400", iconBg: "bg-amber-500/10" },
    violet: { bg: "hover:border-violet-500/30", text: "text-violet-400", iconBg: "bg-violet-500/10" },
    rose: { bg: "hover:border-rose-500/30", text: "text-rose-400", iconBg: "bg-rose-500/10" },
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Welcome, {session.user.name}</h1>
          <p className="text-slate-400">Company production overview and statistics</p>
        </div>

        {/* Production Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            const colors = colorClasses[card.color];
            return (
              <div
                key={card.label}
                className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 ${colors.bg} transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
                    <Icon className={colors.text} size={24} />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${colors.iconBg} ${colors.text}`}>
                    {card.change}
                  </span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {loading ? "..." : card.value}
                </p>
                <p className="text-slate-400 text-sm">{card.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Batches */}
          <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" />
                Recent Production
              </h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              </div>
            ) : recentBatches.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No production batches yet</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.map((batch: any) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-4 bg-slate-700/20 rounded-xl"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{batch.batchNumber}</p>
                      <p className="text-slate-400 text-xs">{batch.productType?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 text-sm">{batch.quantity} pcs</span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          batch.status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : batch.status === "IN_PROGRESS"
                            ? "bg-amber-500/20 text-amber-300"
                            : batch.status === "FAILED"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {batch.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Overview */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Team Overview
            </h2>
            <div className="space-y-4">
              {teamCards.map((item) => {
                const colors = colorClasses[item.color];
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 bg-slate-700/20 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                        <Users size={14} className={colors.text} />
                      </div>
                      <span className="text-slate-300 text-sm">{item.label}</span>
                    </div>
                    <span className="text-white font-bold text-lg">
                      {loading ? "..." : item.value}
                    </span>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Total Employees</span>
                  <span className="text-white font-bold">
                    {loading ? "..." : stats?.totalUsers || 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/owner/managers")}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
            >
              Manage Team
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
