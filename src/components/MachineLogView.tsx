"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, Power, PowerOff, Wrench, Pause, Flame,
  ChevronDown, ChevronUp, User, Calendar, Filter,
  FileText, Droplets, Layers, Scissors, Wind, Package,
  TrendingUp, RotateCcw, TreePine, Thermometer,
} from "lucide-react";

import LiveProductionView from "./LiveProductionView";

// ============ Types ============

interface MachineLogViewProps {
  showOperatorFilter?: boolean;
}

interface LogEntry {
  id: string;
  section: string;
  sectionLabel: string;
  shiftDate: string;
  startTime: string;
  stopTime: string | null;
  operator?: { id: string; name: string };
  machine?: { id: string; name: string; code: string };
  // Hot Press specific
  entries?: any[];
  glueEntries?: any[];
  pauseEvents?: any[];
  approvalStatus?: string;
  totalSheets?: number;
  totalCooks?: number;
  totalRepresses?: number;
  totalGlue?: number;
  totalSqft?: number;
  // Peeling specific
  totalLogs?: number;
  // Dryer specific
  batches?: any[];
  checks?: any[];
  totalBatches?: number;
  totalChecks?: number;
  // Finishing specific
  totalEntries?: number;
}

// ============ Helpers ============

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
function sessionDuration(s: { startTime: string; stopTime: string | null }) {
  if (!s.startTime || !s.stopTime) return "--";
  return durStr(new Date(s.stopTime).getTime() - new Date(s.startTime).getTime());
}

const sectionColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  hotpress: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", icon: Flame },
  peeling: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", icon: TreePine },
  dryer: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", icon: Wind },
  finishing: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", icon: Scissors },
};

// ============ Main Component ============

export default function MachineLogView({ showOperatorFilter = true }: MachineLogViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [operators, setOperators] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sectionFilter, setSectionFilter] = useState("live");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/logs/machine?section=${sectionFilter}&page=${currentPage}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      if (operatorFilter !== "ALL") url += `&operator=${operatorFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
        setOperators(d.operators || []);
        setTotalCount(d.totalCount || 0);
        setTotalPages(d.totalPages || 1);
      }
    } catch (err) {
      console.error("Machine log fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [sectionFilter, fromDate, toDate, operatorFilter, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sectionFilter, fromDate, toDate, operatorFilter]);

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
    setOperatorFilter("ALL");
    setSectionFilter("all");
    setCurrentPage(1);
  };

  // Aggregate stats
  const totalSessions = logs.length;
  const totalSheets = logs.reduce((s, l) => s + (l.totalSheets || 0), 0);
  const totalSqFt = logs.reduce((s, l) => s + (l.totalSqft || 0), 0);
  const hotpressCount = logs.filter(l => l.section === "hotpress").length;
  const peelingCount = logs.filter(l => l.section === "peeling").length;
  const dryerCount = logs.filter(l => l.section === "dryer").length;
  const finishingCount = logs.filter(l => l.section === "finishing").length;

  // Group logs by date
  const grouped: Record<string, LogEntry[]> = {};
  logs.forEach(l => {
    const dateKey = fmtDate(l.shiftDate);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(l);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="text-blue-400" size={28} />
          Machine Production Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">View production data across all factory sections</p>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSectionFilter("live")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            sectionFilter === "live"
              ? "bg-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-900/20"
              : "bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-transparent"
          }`}
        >
          <div className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </div>
          Live View
        </button>

        {[
          { key: "all", label: "All History", count: totalSessions },
          { key: "hotpress", label: "Hot Press", count: hotpressCount },
          { key: "peeling", label: "Peeling", count: peelingCount },
          { key: "dryer", label: "Dryer", count: dryerCount },
          { key: "finishing", label: "Finishing", count: finishingCount },
        ].map(tab => {
          const sc = tab.key !== "all" ? sectionColors[tab.key] : null;
          const isActive = sectionFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSectionFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? tab.key === "all"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : `${sc!.bg} ${sc!.text} border ${sc!.border}`
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
              }`}
            >
              {sc && (() => { const Icon = sc.icon; return <Icon size={14} />; })()}
              {tab.label}
              {isActive && tab.count > 0 && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {sectionFilter === "live" ? (
        <div className="pt-4">
          <LiveProductionView />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalSessions}</p>
          <p className="text-xs text-slate-500">Sessions</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalSheets.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Output</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalSqFt.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
          <p className="text-xs text-slate-500">Sq.Ft (Press)</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{totalCount}</p>
          <p className="text-xs text-slate-500">Total Records</p>
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
            {(fromDate || toDate || operatorFilter !== "ALL") && (
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

            {/* Date Range + Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <p>Loading machine logs...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No logs found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or date range</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateLogs]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-400">{dateLabel}</h3>
                <span className="text-xs text-slate-600">({dateLogs.length} session{dateLogs.length > 1 ? "s" : ""})</span>
              </div>
              <div className="space-y-3">
                {dateLogs.map(log => (
                  <LogCard key={`${log.section}-${log.id}`} log={log} />
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
            Page {currentPage} of {totalPages} ({totalCount} total)
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
      </>
      )}
    </div>
  );
}

// ============ Log Card Component ============

function LogCard({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const sc = sectionColors[log.section] || sectionColors.hotpress;
  const SectionIcon = sc.icon;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <User size={14} className="text-blue-400" />
            <span className="text-white font-bold text-sm">{log.operator?.name || "Operator"}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${sc.bg} ${sc.text} border ${sc.border}`}>
              <SectionIcon size={10} />
              {log.sectionLabel}
            </span>
            {log.machine && (
              <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded-md border border-slate-700 hidden sm:inline-block">
                {log.machine.name}
              </span>
            )}
          </div>
          {log.approvalStatus && (
            <ApprovalBadge status={log.approvalStatus} />
          )}
        </div>

        {/* Time info */}
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-slate-500" />
            {fmt(log.startTime)} → {fmt(log.stopTime)}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{sessionDuration(log)}</span>
        </div>

        {/* Section-specific stats */}
        <SectionStats log={log} />
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-t border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-800/30 transition"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Hide Details" : "Show Details"}
      </button>

      {/* Expanded Details */}
      {expanded && <SectionDetails log={log} />}
    </div>
  );
}

// ============ Section-Specific Stats ============

function SectionStats({ log }: { log: LogEntry }) {
  switch (log.section) {
    case "hotpress":
      return (
        <div className="grid grid-cols-5 gap-2">
          <StatBox label="Cooks" value={log.totalCooks || 0} color="text-white" />
          <StatBox label="Repress" value={log.totalRepresses || 0} color="text-amber-400" />
          <StatBox label="Glue" value={log.totalGlue || 0} color="text-cyan-400" />
          <StatBox label="Sheets" value={log.totalSheets || 0} color="text-emerald-400" />
          <StatBox label="Sq.Ft" value={(log.totalSqft || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} color="text-blue-400" />
        </div>
      );
    case "peeling":
      return (
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Entries" value={log.entries?.length || 0} color="text-white" />
          <StatBox label="Sheets" value={log.totalSheets || 0} color="text-emerald-400" />
          <StatBox label="Logs Used" value={log.totalLogs || 0} color="text-amber-400" />
        </div>
      );
    case "dryer":
      return (
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Batches" value={log.totalBatches || 0} color="text-white" />
          <StatBox label="Sheets" value={log.totalSheets || 0} color="text-emerald-400" />
          <StatBox label="Checks" value={log.totalChecks || 0} color="text-cyan-400" />
        </div>
      );
    case "finishing":
      return (
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Entries" value={log.totalEntries || 0} color="text-white" />
          <StatBox label="Sheets" value={log.totalSheets || 0} color="text-emerald-400" />
        </div>
      );
    default:
      return null;
  }
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

// ============ Section-Specific Details ============

function SectionDetails({ log }: { log: LogEntry }) {
  switch (log.section) {
    case "hotpress":
      return <HotPressDetails log={log} />;
    case "peeling":
      return <PeelingDetails log={log} />;
    case "dryer":
      return <DryerDetails log={log} />;
    case "finishing":
      return <FinishingDetails log={log} />;
    default:
      return null;
  }
}

function HotPressDetails({ log }: { log: LogEntry }) {
  const entries = log.entries || [];
  return (
    <div className="px-3 py-3 border-t border-slate-700/30">
      {/* Start marker */}
      <div className="mx-1 mb-1 py-2 px-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg flex justify-between">
        <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><Power size={14} /> START</span>
        <span className="text-xs text-slate-300">{fmt(log.startTime)}</span>
      </div>

      {/* Entries table */}
      <div className="mx-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Type</th>
              <th className="text-left py-2 px-1">Category</th>
              <th className="text-left py-2 px-1">Thick.</th>
              <th className="text-left py-2 px-1">Size</th>
              <th className="text-left py-2 px-1">Load</th>
              <th className="text-left py-2 px-1">Unload</th>
              <th className="text-right py-2 px-1">Qty</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any, idx: number) => (
              <tr key={entry.id} className={`border-b border-slate-700/30 ${entry.type === "REPRESS" ? "bg-amber-900/10" : ""}`}>
                <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                <td className="py-1.5 px-1">{entry.type === "REPRESS" ? <span className="text-amber-400">R</span> : <span className="text-emerald-400">C</span>}</td>
                <td className="py-1.5 px-1 text-slate-300">{entry.category?.name}</td>
                <td className="py-1.5 px-1 text-white font-medium">{entry.thickness?.value}mm</td>
                <td className="py-1.5 px-1 text-slate-300">{entry.size?.length}×{entry.size?.width}</td>
                <td className="py-1.5 px-1 text-slate-300">{fmt(entry.loadTime)}</td>
                <td className="py-1.5 px-1 text-slate-300">{fmt(entry.unloadTime)}</td>
                <td className="py-1.5 px-1 text-right text-white font-bold">{entry.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pause events */}
      {(log.pauseEvents || []).map((p: any, i: number) => (
        <div key={i} className="mx-1 mt-1 py-1.5 px-3 bg-amber-900/20 border border-amber-700/20 rounded-lg flex justify-between items-center">
          <span className="text-amber-400 text-xs flex items-center gap-2">
            {p.type === "MAINTENANCE" ? <Wrench size={12} /> : <Pause size={12} />}
            {p.type}
          </span>
          <span className="text-xs text-slate-400">{fmt(p.startTime)} → {p.endTime ? fmt(p.endTime) : "ongoing"}</span>
        </div>
      ))}

      {/* Stop marker */}
      <div className="mx-1 mt-1 py-2 px-3 bg-red-900/30 border border-red-700/30 rounded-lg flex justify-between">
        <span className="text-red-400 font-bold text-sm flex items-center gap-2"><PowerOff size={14} /> STOP</span>
        <span className="text-xs text-slate-300">{fmt(log.stopTime)}</span>
      </div>
    </div>
  );
}

function PeelingDetails({ log }: { log: LogEntry }) {
  const entries = log.entries || [];
  return (
    <div className="px-3 py-3 border-t border-slate-700/30">
      <div className="mx-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Tree Type</th>
              <th className="text-left py-2 px-1">Thickness</th>
              <th className="text-right py-2 px-1">Sheets</th>
              <th className="text-right py-2 px-1">Logs</th>
              <th className="text-right py-2 px-1">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any, idx: number) => (
              <tr key={entry.id} className="border-b border-slate-700/30">
                <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                <td className="py-1.5 px-1 text-green-400 font-medium">{entry.peelingMaterial?.treeType}</td>
                <td className="py-1.5 px-1 text-white">{entry.peelingMaterial?.veneerThickness}mm</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 font-bold">{entry.quantity}</td>
                <td className="py-1.5 px-1 text-right text-amber-400 font-bold">{entry.logCount}</td>
                <td className="py-1.5 px-1 text-right text-slate-400">{fmt(entry.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DryerDetails({ log }: { log: LogEntry }) {
  const batches = log.batches || [];
  const checks = log.checks || [];
  return (
    <div className="px-3 py-3 border-t border-slate-700/30 space-y-3">
      {/* Batches */}
      {batches.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1"><Layers size={12} /> Batches</h4>
          <div className="mx-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-left py-2 px-1">Thickness</th>
                  <th className="text-left py-2 px-1">Load</th>
                  <th className="text-left py-2 px-1">Unload</th>
                  <th className="text-right py-2 px-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b: any, idx: number) => (
                  <tr key={b.id} className="border-b border-slate-700/30">
                    <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-1 text-white font-medium">{b.veneerThickness}mm</td>
                    <td className="py-1.5 px-1 text-slate-300">{fmt(b.loadTime)}</td>
                    <td className="py-1.5 px-1 text-slate-300">{b.unloadTime ? fmt(b.unloadTime) : "--"}</td>
                    <td className="py-1.5 px-1 text-right text-emerald-400 font-bold">{b.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Checks */}
      {checks.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1"><Thermometer size={12} /> Temperature Checks</h4>
          <div className="mx-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-right py-2 px-1">Belt Speed</th>
                  <th className="text-right py-2 px-1">Dryer °C</th>
                  <th className="text-right py-2 px-1">Boiler °C</th>
                  <th className="text-right py-2 px-1">Time</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c: any, idx: number) => (
                  <tr key={c.id} className="border-b border-slate-700/30">
                    <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-1 text-right text-white">{c.beltSpeed}</td>
                    <td className="py-1.5 px-1 text-right text-orange-400 font-medium">{c.dryerTemp}°</td>
                    <td className="py-1.5 px-1 text-right text-red-400 font-medium">{c.boilerTemp}°</td>
                    <td className="py-1.5 px-1 text-right text-slate-400">{fmt(c.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FinishingDetails({ log }: { log: LogEntry }) {
  const entries = log.entries || [];
  return (
    <div className="px-3 py-3 border-t border-slate-700/30">
      <div className="mx-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Category</th>
              <th className="text-left py-2 px-1">Thickness</th>
              <th className="text-left py-2 px-1">Size</th>
              <th className="text-right py-2 px-1">Qty</th>
              <th className="text-right py-2 px-1">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any, idx: number) => (
              <tr key={entry.id} className="border-b border-slate-700/30">
                <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                <td className="py-1.5 px-1 text-purple-400 font-medium">{entry.category?.name}</td>
                <td className="py-1.5 px-1 text-white">{entry.thickness?.value}mm</td>
                <td className="py-1.5 px-1 text-slate-300">{entry.size?.length}×{entry.size?.width}</td>
                <td className="py-1.5 px-1 text-right text-emerald-400 font-bold">{entry.quantity}</td>
                <td className="py-1.5 px-1 text-right text-slate-400">{fmt(entry.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Approval Badge ============

function ApprovalBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Draft", color: "text-slate-400", bg: "bg-slate-500/20" },
    SUBMITTED: { label: "Supervisor", color: "text-blue-400", bg: "bg-blue-500/20" },
    SUPERVISOR_APPROVED: { label: "Manager", color: "text-amber-400", bg: "bg-amber-500/20" },
    MANAGER_APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/20" },
    REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/20" },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.color} font-medium`}>
      {c.label}
    </span>
  );
}
