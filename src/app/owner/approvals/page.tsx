"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import React from "react";
import {
  CheckCircle2, XCircle, Clock, Package, Timer, Power, PowerOff,
  Flame, RotateCcw, Droplets, Wrench, Pause, ChevronDown, ChevronUp,
  User, AlertTriangle, TrendingUp, ShieldCheck
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
  supervisorApprovedAt: string | null;
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
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}
function cookingTime(e: PressEntry) {
  if (!e.loadTime || !e.unloadTime) return "--";
  return durStr(new Date(e.unloadTime).getTime() - new Date(e.loadTime).getTime());
}
function coolingTime(cur: PressEntry, next: PressEntry) {
  if (!cur.unloadTime || !next.loadTime) return "--";
  return durStr(new Date(next.loadTime).getTime() - new Date(cur.unloadTime).getTime());
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

export default function OwnerApprovalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<HotPressSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/hotpress?view=approval");
      if (res.ok) {
        const d = await res.json();
        setSessions(d.pendingSessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  useEffect(() => { if (status === "authenticated") fetchData(); }, [fetchData, status]);

  const approve = async (sessionId: string) => {
    const res = await fetch("/api/hotpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "managerApprove", sessionId }),
    });
    if (res.ok) {
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Approval failed");
    }
  };

  const reject = async (sessionId: string) => {
    const res = await fetch("/api/hotpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", sessionId, note: rejectNote }),
    });
    if (res.ok) {
      setRejectingId(null);
      setRejectNote("");
      await fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Rejection failed");
    }
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-slate-400 flex flex-col items-center gap-3">
              <Clock className="animate-pulse text-emerald-500" size={40} />
              <p>Loading pending approvals...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
    <Sidebar user={session.user} />
    <main className="ml-0 md:ml-64 p-3 md:p-8">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" size={28} />
          Approve Production
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review supervisor-approved logs. <strong className="text-amber-400">Approval updates current stock.</strong>
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3 opacity-50" />
          <p className="text-slate-400">No pending approvals</p>
          <p className="text-slate-500 text-sm mt-1">All production logs are up to date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(sess => (
            <OwnerApprovalCard key={sess.id} session={sess} onApprove={() => approve(sess.id)}
              isRejecting={rejectingId === sess.id}
              onStartReject={() => setRejectingId(sess.id)}
              onCancelReject={() => { setRejectingId(null); setRejectNote(""); }}
              rejectNote={rejectNote}
              onRejectNoteChange={setRejectNote}
              onConfirmReject={() => reject(sess.id)}
            />
          ))}
        </div>
      )}
    </div>
    </main>
    </div>
  );
}

function OwnerApprovalCard({
  session, onApprove, isRejecting, onStartReject, onCancelReject, rejectNote, onRejectNoteChange, onConfirmReject
}: {
  session: HotPressSession;
  onApprove: () => void;
  isRejecting: boolean;
  onStartReject: () => void;
  onCancelReject: () => void;
  rejectNote: string;
  onRejectNoteChange: (v: string) => void;
  onConfirmReject: () => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const cooks = session.entries.filter(e => e.type === "COOK" && e.unloadTime);
  const represses = session.entries.filter(e => e.type === "REPRESS" && e.unloadTime);
  const totalSheets = cooks.reduce((s, e) => s + e.quantity, 0);
  const totalGlue = session.glueEntries.reduce((s, e) => s + e.barrels, 0);
  const summary = buildSummary(session.entries);

  const stockImpact: { category: string; thickness: number; size: string; qty: number }[] = [];
  Object.entries(summary).forEach(([cat, thicknesses]) => {
    Object.entries(thicknesses).forEach(([, items]) => {
      items.forEach(item => {
        stockImpact.push({ category: cat, thickness: item.thickness, size: item.size, qty: item.totalQty });
      });
    });
  });

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-emerald-900/10 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-emerald-400" />
            <span className="text-white font-bold">{session.operator?.name || "Operator"}</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={10} /> Supervisor ✓
            </span>
          </div>
          <span className="text-xs text-slate-400">{fmtDate(session.shiftDate)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <span>{fmt(session.startTime)} → {fmt(session.stopTime)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-white">{cooks.length}</p>
            <p className="text-[10px] text-slate-500">Cooks</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{represses.length}</p>
            <p className="text-[10px] text-slate-500">Repress</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-cyan-400">{totalGlue}</p>
            <p className="text-[10px] text-slate-500">Glue Bbl</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{totalSheets}</p>
            <p className="text-[10px] text-slate-500">Sheets</p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex border-b border-slate-700/30">
        <button onClick={() => { setShowLog(!showLog); setShowSummary(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${showLog ? "text-emerald-400 bg-emerald-900/20" : "text-slate-400"}`}>
          <Timer size={14} /> Production List
        </button>
        <button onClick={() => { setShowSummary(!showSummary); setShowLog(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-l border-slate-700/50 ${showSummary ? "text-emerald-400 bg-emerald-900/20" : "text-slate-400"}`}>
          <Package size={14} /> Summary & Stock Impact
        </button>
      </div>

      {/* Production List */}
      {showLog && (
        <div className="px-2 py-3 border-b border-slate-700/30">
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
          <div className="mx-2 mt-1 py-2 px-3 bg-red-900/30 border border-red-700/30 rounded-lg flex justify-between">
            <span className="text-red-400 font-bold text-sm flex items-center gap-2"><PowerOff size={14} /> STOP</span>
            <span className="text-xs text-slate-300">{fmt(session.stopTime)}</span>
          </div>
        </div>
      )}

      {/* Summary + Stock Impact */}
      {showSummary && (
        <div className="px-4 py-3 border-b border-slate-700/30 space-y-3">
          {Object.entries(summary).map(([catName, thicknesses]) => (
            <div key={catName} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
              <h4 className="text-sm font-bold text-emerald-400 mb-2">{catName}</h4>
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

          {/* Stock Impact Preview */}
          <div className="bg-amber-900/10 border border-amber-700/30 rounded-xl p-3">
            <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
              <TrendingUp size={14} /> Stock Impact (on approval)
            </h4>
            <div className="space-y-1">
              {stockImpact.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-800/50 rounded">
                  <span className="text-slate-300">{item.category} • {item.thickness}mm • {item.size}</span>
                  <span className="text-emerald-400 font-bold">+{item.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isRejecting ? (
        <div className="p-4 space-y-3">
          <p className="text-sm text-red-400 font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> Reason for rejection
          </p>
          <textarea
            value={rejectNote}
            onChange={e => onRejectNoteChange(e.target.value)}
            placeholder="Enter reason..."
            className="w-full px-3 py-2 bg-slate-900 border border-red-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-red-500/50 outline-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={onConfirmReject}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
              <XCircle size={18} /> Confirm Reject
            </button>
            <button onClick={onCancelReject}
              className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 flex gap-2">
          <button onClick={onApprove}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]">
            <CheckCircle2 size={22} /> Approve & Update Stock
          </button>
          <button onClick={onStartReject}
            className="px-6 py-4 bg-red-900/50 border border-red-700/50 text-red-400 rounded-2xl text-sm font-bold flex items-center gap-2 active:scale-[0.98]">
            <XCircle size={18} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
