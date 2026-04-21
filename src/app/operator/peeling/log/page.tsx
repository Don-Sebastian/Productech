"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import LongPressButton from "@/components/LongPressButton";
import {
  Power, PowerOff, Pause, Play, Wrench, Scaling,
  Plus, Trash2, ChevronDown, ChevronUp, TreePine,
  Package, Loader2, Clock, Layers
} from "lucide-react";

function fmt(d: string | null | undefined): string {
  if (!d) return "--:--";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

export default function PeelingDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add entry state
  const [showAdd, setShowAdd] = useState(false);
  const [selMaterial, setSelMaterial] = useState<any>(null);
  const [qty, setQty] = useState("0");
  const [logCount, setLogCount] = useState("0");
  const [entryNotes, setEntryNotes] = useState("");
  const [showProdLists, setShowProdLists] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/peeling");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (status === "authenticated" && assigned) fetchData(); }, [fetchData, status, assigned]);

  const doAction = async (action: string, extra: Record<string, any> = {}) => {
    try {
      const res = await fetch("/api/peeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) await fetchData();
      else {
        const err = await res.json();
        alert(err.error || "Action failed");
      }
    } catch { alert("Network error"); }
  };

  if (status === "loading" || assignmentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="animate-spin text-yellow-500" size={32} />
      </div>
    );
  }

  if (!assigned) return <MachineRequiredScreen error={assignmentError} />;
  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-slate-400 flex flex-col items-center gap-3">
              <Scaling className="animate-pulse text-yellow-500" size={40} />
              <p className="text-[10px] uppercase font-black tracking-widest">Loading peeling...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const sess = data?.activeSession;
  const isRunning = sess && ["RUNNING", "PAUSED", "MAINTENANCE"].includes(sess.status);
  const materials = data?.materials || [];
  const prodLists = data?.productionLists || [];

  // Group materials by tree type
  const treeTypes = [...new Set(materials.map((m: any) => m.treeType))];

  const totalSheets = sess?.entries?.reduce((s: number, e: any) => s + e.quantity, 0) || 0;
  const totalLogs = sess?.entries?.reduce((s: number, e: any) => s + e.logCount, 0) || 0;

  // ==================== MACHINE OFF ====================
  if (!isRunning) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
                <Scaling className="text-yellow-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Peeling Machine</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Machine is OFF</p>
              </div>
            </div>

            <LongPressButton
              onComplete={() => doAction("start")}
              className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xl font-black rounded-2xl shadow-xl shadow-emerald-900/20"
            >
              <Power size={28} /> START SESSION
            </LongPressButton>

            {/* Production Lists Preview */}
            {prodLists.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Package size={14} /> Active Production Lists
                </h2>
                <div className="space-y-2">
                  {prodLists.slice(0, 5).map((list: any) => (
                    <div key={list.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 text-xs font-black">{list.order?.customer?.name || "STOCK"}</span>
                        <span className="text-slate-500 text-[10px] font-black">#{list.listNumber}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {list.items?.length || 0} items
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data?.todaySessions?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today's Sessions</h2>
                {data.todaySessions.map((s: any) => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-sm">{fmt(s.startTime)} → {fmt(s.stopTime)}</span>
                      <span className="text-amber-400 text-xs font-black">{s.entries?.reduce((a: number, e: any) => a + e.quantity, 0)} sheets</span>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-1">{s.entries?.length || 0} entries • {s.entries?.reduce((a: number, e: any) => a + e.logCount, 0) || 0} logs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== MACHINE RUNNING ====================
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Scaling className="text-yellow-400" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  Peeling
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    sess.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-400" :
                    sess.status === "PAUSED" ? "bg-amber-500/20 text-amber-400" :
                    "bg-orange-500/20 text-orange-400"
                  }`}>{sess.status}</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Started {fmt(sess.startTime)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-400">{totalSheets}</p>
              <p className="text-[10px] text-slate-500 font-black">SHEETS</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Entries", value: sess.entries?.length || 0 },
              { label: "Logs Used", value: totalLogs, color: "text-yellow-400" },
              { label: "Sheets", value: totalSheets, color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
                <p className={`text-xl font-black ${s.color || "text-white"}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 font-black">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Add Entry Button */}
          <button
            onClick={() => { setShowAdd(true); setSelMaterial(null); setQty("0"); setLogCount("0"); setEntryNotes(""); }}
            className="w-full py-5 bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-lg font-black rounded-2xl shadow-xl shadow-yellow-900/20 flex items-center justify-center gap-3 active:scale-[0.98] transition"
          >
            <Plus size={24} /> ADD PEELING ENTRY
          </button>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-2">
            {sess.status === "RUNNING" ? (
              <LongPressButton onComplete={() => doAction("pause", { sessionId: sess.id })}
                className="py-3 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Pause size={14} /> Pause
              </LongPressButton>
            ) : (
              <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
                className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Play size={14} /> Resume
              </LongPressButton>
            )}
            {sess.status !== "MAINTENANCE" ? (
              <LongPressButton onComplete={() => doAction("maintenance", { sessionId: sess.id })}
                className="py-3 bg-orange-900/50 border border-orange-700/50 text-orange-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Wrench size={14} /> Maint.
              </LongPressButton>
            ) : (
              <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
                className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <Play size={14} /> Resume
              </LongPressButton>
            )}
            <LongPressButton onComplete={() => doAction("stop")}
              className="py-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl text-[10px] font-black uppercase tracking-widest">
              <PowerOff size={14} /> Stop
            </LongPressButton>
          </div>

          {/* Production Lists Toggle */}
          <button onClick={() => setShowProdLists(!showProdLists)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Package size={14} /> Production Lists ({prodLists.length})
            </span>
            {showProdLists ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          {showProdLists && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {prodLists.map((list: any) => (
                <div key={list.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-amber-400 text-xs font-black">{list.order?.customer?.name || "STOCK"}</span>
                    <span className="text-slate-500 text-[10px] font-black">#{list.listNumber}</span>
                  </div>
                  {list.items?.map((item: any) => (
                    <p key={item.id} className="text-white text-[10px] font-medium">
                      {item.category?.name} • {item.thickness?.value}mm • {item.size?.label} — <span className="text-amber-400">{item.producedQuantity}/{item.quantity}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Entries Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} /> Session Entries
              </h2>
              <span className="text-slate-500 text-[10px] font-black">{sess.entries?.length || 0} ENTRIES</span>
            </div>
            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
              {(!sess.entries || sess.entries.length === 0) ? (
                <p className="text-slate-600 text-center py-6 text-sm">No entries yet. Add your first peeling entry.</p>
              ) : (
                [...sess.entries].reverse().map((e: any) => (
                  <div key={e.id} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <TreePine size={16} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-xs">
                          {e.peelingMaterial?.treeType} • {e.peelingMaterial?.veneerThickness}mm
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold">
                          {e.quantity} sheets • {e.logCount} logs • {fmt(e.timestamp)}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => doAction("deleteEntry", { entryId: e.id })}
                      className="p-2 text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Add Entry Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowAdd(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <TreePine size={18} className="text-yellow-500" /> New Peeling Entry
                </h3>
                <button onClick={() => setShowAdd(false)} className="p-2 text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {!selMaterial ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Material</p>
                    {(treeTypes as string[]).map((tree: string) => (
                      <div key={tree}>
                        <p className="text-yellow-400 font-black text-xs mb-2 uppercase">{tree}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {materials.filter((m: any) => m.treeType === tree).map((m: any) => (
                            <button key={m.id} onClick={() => setSelMaterial(m)}
                              className="p-4 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-yellow-600 transition active:scale-95">
                              {m.veneerThickness}mm
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {materials.length === 0 && (
                      <p className="text-slate-500 text-center py-8">No peeling materials configured. Ask your manager to add them.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Selected Material</p>
                      <p className="text-white font-black text-lg">{selMaterial.treeType} • {selMaterial.veneerThickness}mm</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Veneer Sheets</label>
                        <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={0}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-xl" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Logs Used</label>
                        <input type="number" value={logCount} onChange={e => setLogCount(e.target.value)} min={0}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-xl" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Notes (optional)</label>
                      <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="Any notes..."
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-800">
                      <button
                        onClick={async () => {
                          await doAction("addEntry", { sessionId: sess.id, peelingMaterialId: selMaterial.id, quantity: qty, logCount, notes: entryNotes });
                          setShowAdd(false);
                        }}
                        className="flex-1 py-4 bg-yellow-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition"
                      >SAVE ENTRY</button>
                      <button onClick={() => setSelMaterial(null)} className="px-6 bg-slate-800 text-slate-400 font-bold rounded-2xl">BACK</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
