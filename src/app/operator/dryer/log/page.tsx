"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import LongPressButton from "@/components/LongPressButton";
import {
  Power, PowerOff, Pause, Play, Wrench, Wind,
  Plus, ChevronDown, ChevronUp, ArrowDown, ArrowUp,
  Package, Loader2, Clock, Thermometer, Gauge, Timer,
  Bell, BellOff, Settings, Check
} from "lucide-react";

function fmt(d: string | null | undefined): string {
  if (!d) return "--:--";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function durStr(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function DryerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check form
  const [showCheckForm, setShowCheckForm] = useState(false);
  const [beltSpeed, setBeltSpeed] = useState("");
  const [dryerTemp, setDryerTemp] = useState("");
  const [boilerTemp, setBoilerTemp] = useState("");
  const [checkNotes, setCheckNotes] = useState("");

  // Batch loading
  const [showLoadBatch, setShowLoadBatch] = useState(false);
  const [batchThickness, setBatchThickness] = useState("");
  const [batchQty, setBatchQty] = useState("0");

  const [showProdLists, setShowProdLists] = useState(false);

  // Auto-check reminder
  const [reminderActive, setReminderActive] = useState(false);
  const reminderTimeout = useRef<NodeJS.Timeout | null>(null);
  const [reminderAlert, setReminderAlert] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dryer");
      if (res.ok) setData(await res.json());
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (status === "authenticated" && assigned) fetchData(); }, [fetchData, status, assigned]);

  // Auto-check reminder timer
  useEffect(() => {
    const sess = data?.activeSession;
    if (sess?.autoCheckEnabled && ["RUNNING", "PAUSED", "MAINTENANCE"].includes(sess?.status)) {
      setReminderActive(true);
      const interval = (sess.autoCheckIntervalMinutes || 30) * 60 * 1000;
      if (reminderTimeout.current) clearTimeout(reminderTimeout.current);
      reminderTimeout.current = setTimeout(() => {
        setReminderAlert(true);
        // Play alarm sound
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.frequency.value = 800;
          osc.connect(ctx.destination);
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 500);
        } catch {}
      }, interval);
    } else {
      setReminderActive(false);
      if (reminderTimeout.current) clearTimeout(reminderTimeout.current);
    }
    return () => { if (reminderTimeout.current) clearTimeout(reminderTimeout.current); };
  }, [data?.activeSession?.autoCheckEnabled, data?.activeSession?.checks?.length, data?.activeSession?.status]);

  const doAction = async (action: string, extra: Record<string, any> = {}) => {
    try {
      const res = await fetch("/api/dryer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        await fetchData();
        setReminderAlert(false);
      }
      else { const err = await res.json(); alert(err.error || "Action failed"); }
    } catch { alert("Network error"); }
  };

  if (status === "loading" || assignmentLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }
  if (!assigned) return <MachineRequiredScreen error={assignmentError} />;
  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Wind className="animate-pulse text-blue-500" size={40} />
          </div>
        </main>
      </div>
    );
  }

  const sess = data?.activeSession;
  const isRunning = sess && ["RUNNING", "PAUSED", "MAINTENANCE"].includes(sess.status);
  const prodLists = data?.productionLists || [];
  const dryingBatch = sess?.batches?.find((b: any) => !b.unloadTime);

  const totalBatches = sess?.batches?.filter((b: any) => b.unloadTime)?.length || 0;
  const totalChecks = sess?.checks?.length || 0;

  // ==================== MACHINE OFF ====================
  if (!isRunning) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Wind className="text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Dryer Machine</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Machine is OFF</p>
              </div>
            </div>

            <LongPressButton onComplete={() => doAction("start")}
              className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xl font-black rounded-2xl shadow-xl shadow-emerald-900/20">
              <Power size={28} /> START SESSION
            </LongPressButton>

            {data?.todaySessions?.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today's Sessions</h2>
                {data.todaySessions.map((s: any) => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-sm">{fmt(s.startTime)} → {fmt(s.stopTime)}</span>
                      <span className="text-blue-400 text-xs font-black">{s.batches?.filter((b: any) => b.unloadTime)?.length || 0} batches</span>
                    </div>
                    <p className="text-slate-500 text-[10px] mt-1">{s.checks?.length || 0} checks logged</p>
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
          {/* Reminder Alert */}
          {reminderAlert && (
            <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-2xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-red-400" />
                <p className="text-red-300 font-black text-sm">TIME FOR A MACHINE CHECK!</p>
              </div>
              <button onClick={() => { setReminderAlert(false); setShowCheckForm(true); }}
                className="px-4 py-2 bg-red-600 text-white font-black rounded-xl text-xs">LOG NOW</button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Wind className="text-blue-400" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  Dryer
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    sess.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-400" :
                    sess.status === "PAUSED" ? "bg-amber-500/20 text-amber-400" :
                    "bg-orange-500/20 text-orange-400"
                  }`}>{sess.status}</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Started {fmt(sess.startTime)}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{totalBatches}</p>
              <p className="text-[10px] text-slate-500 font-black">Dried</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-cyan-400">{totalChecks}</p>
              <p className="text-[10px] text-slate-500 font-black">Checks</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center flex flex-col items-center justify-center">
              <button onClick={() => doAction("toggleAutoCheck", { sessionId: sess.id, enabled: !sess.autoCheckEnabled })}
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${sess.autoCheckEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                {sess.autoCheckEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                {sess.autoCheckEnabled ? "Auto" : "Manual"}
              </button>
              <p className="text-[10px] text-slate-600 font-bold">{sess.autoCheckIntervalMinutes}min</p>
            </div>
          </div>

          {/* Drying Action */}
          {!dryingBatch ? (
            showLoadBatch ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Load Veneer Batch</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Thickness (mm)</label>
                    <input type="number" step="0.1" value={batchThickness} onChange={e => setBatchThickness(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center" placeholder="1.4" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Quantity</label>
                    <input type="number" value={batchQty} onChange={e => setBatchQty(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <LongPressButton onComplete={async () => {
                    await doAction("loadBatch", { sessionId: sess.id, veneerThickness: batchThickness, quantity: batchQty });
                    setShowLoadBatch(false);
                  }} disabled={!batchThickness}
                    className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl disabled:opacity-30">
                    <ArrowDown size={16} /> LOAD
                  </LongPressButton>
                  <button onClick={() => setShowLoadBatch(false)} className="px-4 bg-slate-800 text-slate-400 rounded-xl font-bold">✕</button>
                </div>
              </div>
            ) : (
              <LongPressButton onComplete={() => { setShowLoadBatch(true); setBatchThickness(""); setBatchQty("0"); }}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-black rounded-2xl shadow-xl">
                <ArrowDown size={24} /> LOAD VENEER BATCH
              </LongPressButton>
            )
          ) : (
            <LongPressButton onComplete={() => doAction("unloadBatch", { batchId: dryingBatch.id })}
              className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-lg font-black rounded-2xl shadow-xl animate-pulse">
              <ArrowUp size={24} /> UNLOAD ({dryingBatch.veneerThickness}mm)
              <span className="text-sm font-normal ml-2">loaded {fmt(dryingBatch.loadTime)}</span>
            </LongPressButton>
          )}

          {/* Add Check Button */}
          <button onClick={() => { setShowCheckForm(true); setBeltSpeed(""); setDryerTemp(""); setBoilerTemp(""); setCheckNotes(""); setReminderAlert(false); }}
            className="w-full py-4 bg-gradient-to-r from-cyan-800 to-teal-800 text-white font-black rounded-2xl flex items-center justify-center gap-3 text-sm active:scale-[0.98]">
            <Thermometer size={18} /> LOG MACHINE CHECK ({totalChecks})
          </button>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-2">
            {sess.status === "RUNNING" ? (
              <LongPressButton onComplete={() => doAction("pause", { sessionId: sess.id })}
                className="py-3 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-xl text-[10px] font-black uppercase">
                <Pause size={14} /> Pause
              </LongPressButton>
            ) : (
              <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
                className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-[10px] font-black uppercase">
                <Play size={14} /> Resume
              </LongPressButton>
            )}
            {sess.status !== "MAINTENANCE" ? (
              <LongPressButton onComplete={() => doAction("maintenance", { sessionId: sess.id })}
                className="py-3 bg-orange-900/50 border border-orange-700/50 text-orange-300 rounded-xl text-[10px] font-black uppercase">
                <Wrench size={14} /> Maint.
              </LongPressButton>
            ) : (
              <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
                className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-[10px] font-black uppercase">
                <Play size={14} /> Resume
              </LongPressButton>
            )}
            <LongPressButton onComplete={() => doAction("stop")}
              className="py-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl text-[10px] font-black uppercase">
              <PowerOff size={14} /> Stop
            </LongPressButton>
          </div>

          {/* Production Lists */}
          <button onClick={() => setShowProdLists(!showProdLists)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Package size={14} /> Production Lists ({prodLists.length})
            </span>
            {showProdLists ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          {showProdLists && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {prodLists.map((list: any) => (
                <div key={list.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-amber-400 text-xs font-black">{list.order?.customer?.name || "STOCK"}</span>
                    <span className="text-slate-500 text-[10px] font-black">#{list.listNumber}</span>
                  </div>
                  {list.items?.map((item: any) => (
                    <p key={item.id} className="text-white text-[10px]">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Recent Batches & Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Recent Batches</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...(sess.batches || [])].filter((b: any) => b.unloadTime).reverse().slice(0, 8).map((b: any) => (
                  <div key={b.id} className="bg-slate-800/30 rounded-lg p-2 flex justify-between items-center text-xs">
                    <span className="text-white font-bold">{b.veneerThickness}mm • {b.quantity} pcs</span>
                    <span className="text-cyan-400 text-[10px]">{durStr(new Date(b.unloadTime).getTime() - new Date(b.loadTime).getTime())}</span>
                  </div>
                ))}
                {(!sess.batches || sess.batches.filter((b: any) => b.unloadTime).length === 0) && (
                  <p className="text-slate-600 text-center py-4 text-[10px]">No batches yet</p>
                )}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Recent Checks</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...(sess.checks || [])].reverse().slice(0, 8).map((c: any) => (
                  <div key={c.id} className="bg-slate-800/30 rounded-lg p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white font-bold">Belt: {c.beltSpeed} • Dryer: {c.dryerTemp}°C • Boiler: {c.boilerTemp}°C</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">{fmt(c.timestamp)}</p>
                  </div>
                ))}
                {(!sess.checks || sess.checks.length === 0) && (
                  <p className="text-slate-600 text-center py-4 text-[10px]">No checks yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Check Form Modal */}
        {showCheckForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowCheckForm(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Thermometer size={18} className="text-cyan-500" /> Machine Check
                </h3>
                <button onClick={() => setShowCheckForm(false)} className="p-2 text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Belt Speed</label>
                  <input type="number" step="0.1" value={beltSpeed} onChange={e => setBeltSpeed(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-xl" placeholder="0.0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dryer Temp (°C)</label>
                    <input type="number" value={dryerTemp} onChange={e => setDryerTemp(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-xl" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Oil Boiler (°C)</label>
                    <input type="number" value={boilerTemp} onChange={e => setBoilerTemp(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-xl" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Notes (optional)</label>
                  <input type="text" value={checkNotes} onChange={e => setCheckNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Any observations..." />
                </div>
                <button onClick={async () => {
                  await doAction("addCheck", { sessionId: sess.id, beltSpeed, dryerTemp, boilerTemp, notes: checkNotes });
                  setShowCheckForm(false);
                }}
                  disabled={!beltSpeed && !dryerTemp && !boilerTemp}
                  className="w-full py-4 bg-cyan-600 text-white font-black rounded-2xl shadow-lg disabled:opacity-30 active:scale-95 transition flex items-center justify-center gap-2">
                  <Check size={20} /> SAVE CHECK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
