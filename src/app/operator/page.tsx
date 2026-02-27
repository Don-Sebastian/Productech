"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Gauge,
  ClipboardList,
  Play,
  Square,
  Clock,
  Activity,
  Zap,
} from "lucide-react";

export default function OperatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      // Fetch stats
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data.stats);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      // Fetch recent logs
      fetch("/api/machine-logs")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setRecentLogs(data.slice(0, 10));
        })
        .catch(console.error);
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
      </div>
    );
  }

  const actionIcons: Record<string, { icon: any; color: string }> = {
    START: { icon: Play, color: "text-emerald-400 bg-emerald-500/20" },
    STOP: { icon: Square, color: "text-red-400 bg-red-500/20" },
    PAUSE: { icon: Clock, color: "text-amber-400 bg-amber-500/20" },
    RESUME: { icon: Zap, color: "text-blue-400 bg-blue-500/20" },
    MAINTENANCE: { icon: Activity, color: "text-violet-400 bg-violet-500/20" },
    BREAKDOWN: { icon: Activity, color: "text-red-400 bg-red-500/20" },
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Operator Dashboard</h1>
          <p className="text-slate-400">Log machine operations and track your activity</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-rose-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Gauge className="text-rose-400" size={24} />
              </div>
              <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full">Today</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.todayLogs || 0}
            </p>
            <p className="text-slate-400 text-sm">Logs Today</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ClipboardList className="text-blue-400" size={24} />
              </div>
              <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">All Time</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.totalLogs || 0}
            </p>
            <p className="text-slate-400 text-sm">Total Logs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Log */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-rose-400" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/operator/log")}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-rose-600/20 to-pink-600/20 border border-rose-500/20 rounded-xl hover:border-rose-500/40 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <Gauge size={18} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Log Machine Action</p>
                  <p className="text-slate-400 text-xs">Start, stop, pause or resume</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/operator/history")}
                className="w-full flex items-center gap-3 p-4 bg-slate-700/20 rounded-xl hover:bg-slate-700/40 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <ClipboardList size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">View My Logs</p>
                  <p className="text-slate-400 text-xs">Browse your log history</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              Recent Activity
            </h2>
            {recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <Gauge size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No logs yet. Start logging your machine actions!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => {
                  const actionConfig = actionIcons[log.action] || actionIcons.START;
                  const ActionIcon = actionConfig.icon;
                  return (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-700/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${actionConfig.color.split(" ")[1]}`}>
                          <ActionIcon size={14} className={actionConfig.color.split(" ")[0]} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{log.machineName}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full ${actionConfig.color.split(" ")[1]} ${actionConfig.color.split(" ")[0]}`}>
                        {log.action}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
