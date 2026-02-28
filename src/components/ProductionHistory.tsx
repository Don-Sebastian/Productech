"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, Package, Timer, Power, PowerOff,
  Flame, RotateCcw, Droplets, Wrench, Pause,
  ChevronDown, ChevronUp, User, Search,
  Calendar, Filter, CheckCircle2, XCircle,
  ShieldCheck, Send, AlertTriangle, FileText,
  TrendingUp
} from "lucide-react";

interface PressEntry {
  id: string;
  type: "COOK" | "REPRESS";
  loadTime: string | null;
  unloadTime: string | null;
  quantity: number;
  category: { id: string; name: string };
  thickness: { id: string; value: number };
  size: { id: string; label: string; length: number; width: number };
}

interface GlueEntry { id: string; time: string; barrels: number; }
interface PauseEvent { id: string; type: string; startTime: string; endTime: string | null; }

interface HotPressSession {
  id: string;
  status: string;
  startTime: string;
  stopTime: string | null;
  numDaylights: number;
  shiftDate: string;
  approvalStatus: string;
  operatorApprovedAt: string | null;
  supervisorApprovedAt: string | null;
  managerApprovedAt: string | null;
  entries: PressEntry[];
  glueEntries: GlueEntry[];
  pauseEvents: PauseEvent[];
  operator?: { id: string; name: string; email: string };
}

function fmt(d: string | null | undefined) {
  if (!d) return "--:--";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function durStr(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  if (m < 60) return r > 0 ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60); const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
function cookingTime(e: PressEntry) {
  if (!e.loadTime || !e.unloadTime) return "--";
  return durStr(new Date(e.unloadTime).getTime() - new Date(e.loadTime).getTime());
}
function coolingTime(cur: PressEntry, next: PressEntry) {
  if (!cur.unloadTime || !next.loadTime) return "--";
  return durStr(new Date(next.loadTime).getTime() - new Date(cur.unloadTime).getTime());
}
function sessionDuration(s: HotPressSession) {
  if (!s.startTime || !s.stopTime) return "--";
  return durStr(new Date(s.stopTime).getTime() - new Date(s.startTime).getTime());
}

function buildSummary(entries: PressEntry[]) {
  const summary: Record<string, { category: string; thickness: number; size: string; totalQty: number; cookCount: number; totalCookMs: number }> = {};
  entries.filter(e => e.type === "COOK" && e.unloadTime).forEach(e => {
    const k = `${e.category.name}|${e.thickness.value}|${e.size.length}x${e.size.width}`;
    if (!summary[k]) summary[k] = { category: e.category.name, thickness: e.thickness.value, size: `${e.size.length}×${e.size.width}`, totalQty: 0, cookCount: 0, totalCookMs: 0 };
    summary[k].totalQty += e.quantity;
    summary[k].cookCount += 1;
    if (e.loadTime && e.unloadTime) summary[k].totalCookMs += new Date(e.unloadTime).getTime() - new Date(e.loadTime).getTime();
  });
  const grouped: Record<string, Record<string, typeof summary[string][]>> = {};
  Object.values(summary).forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = {};
    const th = `${s.thickness}mm`;
    if (!grouped[s.category][th]) grouped[s.category][th] = [];
    grouped[s.category][th].push(s);
  });
  return grouped;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: "Draft", color: "text-slate-400", bg: "bg-slate-500/20", icon: Clock },
  SUBMITTED: { label: "With Supervisor", color: "text-blue-400", bg: "bg-blue-500/20", icon: Send },
  SUPERVISOR_APPROVED: { label: "With Manager", color: "text-amber-400", bg: "bg-amber-500/20", icon: ShieldCheck },
  MANAGER_APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/20", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/20", icon: XCircle },
};

interface ProductionHistoryProps {
  showOperatorFilter?: boolean; // supervisor/manager/owner can filter by operator
}

export default function ProductionHistory({ showOperatorFilter = false }: ProductionHistoryProps) {
  const [sessions, setSessions] = useState<HotPressSession[]>([]);
  const [operators, setOperators] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/hotpress?view=history&page=${currentPage}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      if (approvalFilter !== "ALL") url += `&status=${approvalFilter}`;
      if (operatorFilter !== "ALL") url += `&operator=${operatorFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions || []);
        setOperators(d.operators || []);
        setTotalCount(d.totalCount || 0);
        setTotalPages(d.totalPages || 1);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, approvalFilter, operatorFilter, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Quick date presets
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setFromDate(today);
    setToDate(today);
  };
  const setThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    setFromDate(monday.toISOString().split("T")[0]);
    setToDate(now.toISOString().split("T")[0]);
  };
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(first.toISOString().split("T")[0]);
    setToDate(now.toISOString().split("T")[0]);
  };
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setApprovalFilter("ALL");
    setOperatorFilter("ALL");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, approvalFilter, operatorFilter]);

  // Aggregate stats
  const totalSessions = sessions.length;
  const totalSheets = sessions.reduce((s, sess) =>
    s + sess.entries.filter(e => e.type === "COOK" && e.unloadTime).reduce((a, e) => a + e.quantity, 0), 0);
  const totalGlue = sessions.reduce((s, sess) =>
    s + sess.glueEntries.reduce((a, e) => a + e.barrels, 0), 0);
  const approvedCount = sessions.filter(s => s.approvalStatus === "MANAGER_APPROVED").length;

  // Group sessions by date
  const grouped: Record<string, HotPressSession[]> = {};
  sessions.forEach(s => {
    const dateKey = fmtDate(s.shiftDate);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="text-blue-400" size={28} />
          Production Log History
        </h1>
        <p className="text-slate-400 text-sm mt-1">View and search all past machine log sessions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalSessions}</p>
          <p className="text-xs text-slate-500">Sessions</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalSheets}</p>
          <p className="text-xs text-slate-500">Total Sheets</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{totalGlue}</p>
          <p className="text-xs text-slate-500">Glue (bbl)</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{approvedCount}</p>
          <p className="text-xs text-slate-500">Approved</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between text-white font-medium text-sm"
        >
          <span className="flex items-center gap-2">
            <Filter size={16} className="text-blue-400" />
            Filters
            {(fromDate || toDate || approvalFilter !== "ALL" || operatorFilter !== "ALL") && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Active</span>
            )}
          </span>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-700/30">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 pt-3">
              <button onClick={setToday}
                className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition">Today</button>
              <button onClick={setThisWeek}
                className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition">This Week</button>
              <button onClick={setThisMonth}
                className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition">This Month</button>
              <button onClick={clearFilters}
                className="px-3 py-1.5 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 transition">Clear All</button>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" />
                </div>
              </div>
            </div>

            {/* Status + Operator Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Approval Status</label>
                <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Draft</option>
                  <option value="SUBMITTED">With Supervisor</option>
                  <option value="SUPERVISOR_APPROVED">With Manager</option>
                  <option value="MANAGER_APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {showOperatorFilter && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Operator</label>
                  <select value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none">
                    <option value="ALL">All Operators</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-slate-400 flex flex-col items-center gap-3">
            <Clock className="animate-pulse text-blue-500" size={40} />
            <p>Loading production history...</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No sessions found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateSessions]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-400">{dateLabel}</h3>
                <span className="text-xs text-slate-600">({dateSessions.length} session{dateSessions.length > 1 ? "s" : ""})</span>
              </div>
              <div className="space-y-3">
                {dateSessions.map(sess => (
                  <HistorySessionCard key={sess.id} session={sess} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing {((currentPage - 1) * 50) + 1}–{Math.min(currentPage * 50, totalCount)} of {totalCount} sessions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-white font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== Session Card for History View ======
function HistorySessionCard({ session }: { session: HotPressSession }) {
  const [showLog, setShowLog] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const cooks = session.entries.filter(e => e.type === "COOK" && e.unloadTime);
  const represses = session.entries.filter(e => e.type === "REPRESS" && e.unloadTime);
  const totalSheets = cooks.reduce((s, e) => s + e.quantity, 0);
  const totalGlue = session.glueEntries.reduce((s, e) => s + e.barrels, 0);
  const summary = buildSummary(session.entries);
  const sc = statusConfig[session.approvalStatus] || statusConfig.PENDING;
  const StatusIcon = sc.icon;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-blue-400" />
            <span className="text-white font-bold text-sm">{session.operator?.name || "Operator"}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${sc.bg} ${sc.color}`}>
            <StatusIcon size={10} />
            {sc.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-slate-500" />
            {fmt(session.startTime)} → {fmt(session.stopTime)}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{sessionDuration(session)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-white">{cooks.length}</p>
            <p className="text-[10px] text-slate-500">Cooks</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-amber-400">{represses.length}</p>
            <p className="text-[10px] text-slate-500">Repress</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-cyan-400">{totalGlue}</p>
            <p className="text-[10px] text-slate-500">Glue</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-emerald-400">{totalSheets}</p>
            <p className="text-[10px] text-slate-500">Sheets</p>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex border-t border-slate-700/30">
        <button onClick={() => { setShowLog(!showLog); setShowSummary(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${showLog ? "text-blue-400 bg-blue-900/20" : "text-slate-400"}`}>
          <Timer size={14} /> Production List
        </button>
        <button onClick={() => { setShowSummary(!showSummary); setShowLog(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-l border-slate-700/50 ${showSummary ? "text-emerald-400 bg-emerald-900/20" : "text-slate-400"}`}>
          <Package size={14} /> Summary
        </button>
      </div>

      {/* Production List */}
      {showLog && (
        <div className="px-2 py-3 border-t border-slate-700/30">
          <div className="mx-2 mb-1 py-2 px-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg flex justify-between">
            <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><Power size={14} /> START</span>
            <span className="text-xs text-slate-300">{fmt(session.startTime)}</span>
          </div>
          <div className="mx-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-left py-2 px-1">Type</th>
                  <th className="text-left py-2 px-1">Thick.</th>
                  <th className="text-left py-2 px-1">Size</th>
                  <th className="text-left py-2 px-1">Load</th>
                  <th className="text-left py-2 px-1">Unload</th>
                  <th className="text-right py-2 px-1">Qty</th>
                  <th className="text-right py-2 px-1">Total</th>
                  <th className="text-right py-2 px-1">Cook</th>
                  <th className="text-right py-2 px-1">Cool</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totals: Record<string, number> = {};
                  return session.entries.map((entry, idx) => {
                    let runTotal: number | null = null;
                    if (entry.type === "COOK" && entry.unloadTime) {
                      const key = `${entry.thickness.value}|${entry.size.length}x${entry.size.width}`;
                      totals[key] = (totals[key] || 0) + entry.quantity;
                      runTotal = totals[key];
                    }
                    const next = session.entries[idx + 1];
                    const cool = (entry.unloadTime && next?.loadTime) ? coolingTime(entry, next) : "--";
                    return (
                      <tr key={entry.id} className={`border-b border-slate-700/30 ${entry.type === "REPRESS" ? "bg-amber-900/10" : ""}`}>
                        <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-1">{entry.type === "REPRESS" ? <span className="text-amber-400">R</span> : <span className="text-emerald-400">C</span>}</td>
                        <td className="py-1.5 px-1 text-white font-medium">{entry.thickness.value}mm</td>
                        <td className="py-1.5 px-1 text-slate-300">{entry.size.length}×{entry.size.width}</td>
                        <td className="py-1.5 px-1 text-slate-300">{fmt(entry.loadTime)}</td>
                        <td className="py-1.5 px-1 text-slate-300">{fmt(entry.unloadTime)}</td>
                        <td className="py-1.5 px-1 text-right text-white font-bold">{entry.quantity}</td>
                        <td className="py-1.5 px-1 text-right text-amber-400 font-bold">{entry.type === "COOK" && runTotal ? `Σ${runTotal}` : ""}</td>
                        <td className="py-1.5 px-1 text-right text-cyan-400">{cookingTime(entry)}</td>
                        <td className="py-1.5 px-1 text-right text-slate-500">{cool}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          {session.glueEntries.map(g => (
            <div key={g.id} className="mx-2 mt-1 py-1.5 px-3 bg-cyan-900/20 border border-cyan-700/20 rounded-lg flex justify-between items-center">
              <span className="text-cyan-400 text-xs flex items-center gap-2"><Droplets size={12} /> Glue: {g.barrels} bbl</span>
              <span className="text-xs text-slate-400">{fmt(g.time)}</span>
            </div>
          ))}
          {session.pauseEvents.map(p => (
            <div key={p.id} className="mx-2 mt-1 py-1.5 px-3 bg-amber-900/20 border border-amber-700/20 rounded-lg flex justify-between items-center">
              <span className="text-amber-400 text-xs flex items-center gap-2">
                {p.type === "MAINTENANCE" ? <Wrench size={12} /> : <Pause size={12} />}
                {p.type}
              </span>
              <span className="text-xs text-slate-400">{fmt(p.startTime)} → {p.endTime ? fmt(p.endTime) : "ongoing"}</span>
            </div>
          ))}
          <div className="mx-2 mt-1 py-2 px-3 bg-red-900/30 border border-red-700/30 rounded-lg flex justify-between">
            <span className="text-red-400 font-bold text-sm flex items-center gap-2"><PowerOff size={14} /> STOP</span>
            <span className="text-xs text-slate-300">{fmt(session.stopTime)}</span>
          </div>
        </div>
      )}

      {/* Summary */}
      {showSummary && (
        <div className="px-4 py-3 border-t border-slate-700/30 space-y-3">
          {Object.entries(summary).map(([catName, thicknesses]) => (
            <div key={catName} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
              <h4 className="text-sm font-bold text-blue-400 mb-2">{catName}</h4>
              {Object.entries(thicknesses).map(([th, items]) => (
                <div key={th} className="mb-2">
                  <p className="text-xs text-slate-400 font-medium mb-1">{th}</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-2 text-xs border-b border-slate-700/20 last:border-0">
                      <span className="text-slate-300">{item.size}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-bold">{item.totalQty} sheets</span>
                        <span className="text-slate-500">{item.cookCount} cooks</span>
                        <span className="text-cyan-400">{durStr(item.totalCookMs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3 flex justify-between items-center">
            <span className="text-white font-bold">Total Production</span>
            <span className="text-2xl font-black text-emerald-400">{totalSheets} sheets</span>
          </div>
        </div>
      )}
    </div>
  );
}
