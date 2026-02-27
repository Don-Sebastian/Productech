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
  Wrench,
  ClipboardList,
  BarChart3,
} from "lucide-react";

export default function ManagerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Manager Dashboard</h1>
          <p className="text-slate-400">Monitor manufacturing and manage your team</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Batches", value: stats?.totalBatches || 0, icon: Factory, color: "bg-blue-500/10 text-blue-400", border: "hover:border-blue-500/30" },
            { label: "Completed", value: stats?.completedBatches || 0, icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400", border: "hover:border-emerald-500/30" },
            { label: "Supervisors", value: stats?.totalSupervisors || 0, icon: Users, color: "bg-amber-500/10 text-amber-400", border: "hover:border-amber-500/30" },
            { label: "Operators", value: stats?.totalOperators || 0, icon: Wrench, color: "bg-rose-500/10 text-rose-400", border: "hover:border-rose-500/30" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 ${card.border} transition-all duration-300`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.color.split(" ")[0]} flex items-center justify-center`}>
                    <Icon className={card.color.split(" ")[1]} size={24} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{loading ? "..." : card.value}</p>
                <p className="text-slate-400 text-sm">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Recent Batches & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              Recent Production
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              </div>
            ) : recentBatches.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No production batches yet</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.map((batch: any) => (
                  <div key={batch.id} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-xl">
                    <div>
                      <p className="text-white font-medium text-sm">{batch.batchNumber}</p>
                      <p className="text-slate-400 text-xs">{batch.productType?.name} • {batch.assignedTo?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 text-sm">{batch.quantity} pcs</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        batch.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-300" :
                        batch.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
                        "bg-blue-500/20 text-blue-300"
                      }`}>
                        {batch.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ClipboardList size={18} className="text-cyan-400" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/manager/supervisors")}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/20 rounded-xl hover:bg-slate-700/40 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Users size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Manage Supervisors</p>
                  <p className="text-slate-500 text-xs">Add or edit supervisors</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/manager/operators")}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/20 rounded-xl hover:bg-slate-700/40 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <Wrench size={16} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Manage Operators</p>
                  <p className="text-slate-500 text-xs">Add or edit operators</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/manager/production")}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/20 rounded-xl hover:bg-slate-700/40 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Factory size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Production Overview</p>
                  <p className="text-slate-500 text-xs">Monitor all production batches</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
