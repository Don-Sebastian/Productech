"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ClipboardList,
  Search,
  Calendar,
  Play,
  Square,
  Pause,
  Zap,
  Wrench,
  AlertTriangle,
} from "lucide-react";

export default function OperatorHistory() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      let url = "/api/machine-logs";
      if (dateFilter) url += `?date=${dateFilter}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setLogs(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, dateFilter]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
      </div>
    );
  }

  const actionConfig: Record<string, { icon: any; color: string; bg: string }> = {
    START: { icon: Play, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    STOP: { icon: Square, color: "text-red-400", bg: "bg-red-500/20" },
    PAUSE: { icon: Pause, color: "text-amber-400", bg: "bg-amber-500/20" },
    RESUME: { icon: Zap, color: "text-blue-400", bg: "bg-blue-500/20" },
    MAINTENANCE: { icon: Wrench, color: "text-violet-400", bg: "bg-violet-500/20" },
    BREAKDOWN: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20" },
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.machineName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group logs by date
  const groupedLogs: Record<string, any[]> = {};
  filteredLogs.forEach((log) => {
    const date = new Date(log.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedLogs[date]) groupedLogs[date] = [];
    groupedLogs[date].push(log);
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <ClipboardList className="text-rose-400" size={28} />
            My Logs
          </h1>
          <p className="text-slate-400">View your machine operation history</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by machine, action, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 outline-none transition"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition text-sm"
            >
              Clear Date
            </button>
          )}
        </div>

        {/* Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
          </div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No logs found</p>
            <p className="text-slate-500 text-sm mt-1">Start logging machine actions to see them here</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar size={14} />
                  {date}
                  <span className="text-slate-600">({dateLogs.length} entries)</span>
                </h3>
                <div className="space-y-2">
                  {dateLogs.map((log: any) => {
                    const config = actionConfig[log.action] || actionConfig.START;
                    const ActionIcon = config.icon;
                    return (
                      <div
                        key={log.id}
                        className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                            <ActionIcon size={16} className={config.color} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{log.machineName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {log.section && (
                                <span className="text-slate-500 text-xs">📍 {log.section}</span>
                              )}
                              {log.notes && (
                                <span className="text-slate-500 text-xs">• {log.notes}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.color} font-medium`}>
                            {log.action}
                          </span>
                          <span className="text-slate-500 text-xs font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
