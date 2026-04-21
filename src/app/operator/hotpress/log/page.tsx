"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import LongPressButton from "@/components/LongPressButton";
import {
  Power, PowerOff, Flame, Timer, ArrowDown, ArrowUp, RotateCcw,
  Droplets, Pause, Play, Wrench, ChevronDown, ChevronUp,
  CheckCircle2, Send, Clock, Package, Edit3, X, Check, AlertTriangle
} from "lucide-react";

interface PressEntry {
  id: string;
  type: "COOK" | "REPRESS";
  loadTime: string | null;
  unloadTime: string | null;
  quantity: number;
  notes: string | null;
  createdAt: string;
  category: { id: string; name: string };
  thickness: { id: string; value: number };
  size: { id: string; label: string; length: number; width: number };
}

interface GlueEntry {
  id: string;
  time: string;
  barrels: number;
}

interface PauseEvent {
  id: string;
  type: string;
  startTime: string;
  endTime: string | null;
}

interface HotPressSession {
  id: string;
  status: string;
  startTime: string;
  stopTime: string | null;
  numDaylights: number;
  shiftDate: string;
  currentCategoryId: string | null;
  currentThicknessId: string | null;
  currentSizeId: string | null;
  approvalStatus: string;
  operatorApprovedAt: string | null;
  entries: PressEntry[];
  glueEntries: GlueEntry[];
  pauseEvents: PauseEvent[];
  operator?: { id: string; name: string; email: string };
}

interface Product {
  category: { id: string; name: string; sortOrder: number };
  thickness: { id: string; value: number };
  size: { id: string; label: string; length: number; width: number };
}

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

function cookingTime(entry: PressEntry): string {
  if (!entry.loadTime || !entry.unloadTime) return "--";
  const ms = new Date(entry.unloadTime).getTime() - new Date(entry.loadTime).getTime();
  return durStr(ms);
}

function coolingTime(current: PressEntry, next: PressEntry): string {
  if (!current.unloadTime || !next.loadTime) return "--";
  const ms = new Date(next.loadTime).getTime() - new Date(current.unloadTime).getTime();
  return durStr(ms);
}

// Build the production summary: group COOK entries by category → thickness → size
function buildProductionSummary(entries: PressEntry[]) {
  const summary: Record<string, {
    category: string;
    thickness: number;
    size: string;
    sizeLabel: string;
    totalQty: number;
    cookCount: number;
    totalCookTimeMs: number;
  }> = {};

  entries.filter(e => e.type === "COOK" && e.unloadTime).forEach(e => {
    const key = `${e.category.name}|${e.thickness.value}|${e.size.length}x${e.size.width}`;
    if (!summary[key]) {
      summary[key] = {
        category: e.category.name,
        thickness: e.thickness.value,
        size: `${e.size.length}×${e.size.width}`,
        sizeLabel: e.size.label,
        totalQty: 0,
        cookCount: 0,
        totalCookTimeMs: 0,
      };
    }
    summary[key].totalQty += e.quantity;
    summary[key].cookCount += 1;
    if (e.loadTime && e.unloadTime) {
      summary[key].totalCookTimeMs += new Date(e.unloadTime).getTime() - new Date(e.loadTime).getTime();
    }
  });

  // Group by category then thickness
  const grouped: Record<string, Record<string, typeof summary[string][]>> = {};
  Object.values(summary).forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = {};
    const thKey = `${s.thickness}mm`;
    if (!grouped[s.category][thKey]) grouped[s.category][thKey] = [];
    grouped[s.category][thKey].push(s);
  });

  return grouped;
}

export default function OperatorLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);
  const [data, setData] = useState<{
    activeSession: HotPressSession | null;
    todaySessions: HotPressSession[];
    products: Product[];
    productionLists?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Cook/Cool countdown timer
  const [timerType, setTimerType] = useState<"cook" | "cool" | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0); // seconds remaining
  const [timerTotal, setTimerTotal] = useState(0); // total seconds
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmPlayed = useRef(false);

  // Product selection modal
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pickMode, setPickMode] = useState<"catalog" | "productionLists">("productionLists");
  const [pickStep, setPickStep] = useState<"category" | "thickness" | "size">("category");
  const [pickCat, setPickCat] = useState<string | null>(null);
  const [pickThick, setPickThick] = useState<string | null>(null);

  // Log visibility
  const [showLog, setShowLog] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  // Glue input
  const [glueBarrels, setGlueBarrels] = useState(1);
  const [showGlueInput, setShowGlueInput] = useState(false);

  // Daylights editing
  const [editingDaylights, setEditingDaylights] = useState(false);
  const [daylightsVal, setDaylightsVal] = useState(10);

  // Quantity editing 
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [qtyVal, setQtyVal] = useState(10);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/hotpress");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (status === "authenticated" && assigned) fetchData(); }, [fetchData, status, assigned]);

  const [actionLoading, setActionLoading] = useState(false);

  const doAction = async (action: string, extra: Record<string, any> = {}) => {
    if (actionLoading) return; // prevent double-clicks
    setActionLoading(true);
    try {
      // ⚡ Optimistic UI Update: Make the change instantly visible before the heavy refetch
      setData(prev => {
        if (!prev || !prev.activeSession) return prev;
        const s = { ...prev.activeSession };
        
        if (action === "pause") s.status = "PAUSED";
        else if (action === "resume") s.status = "RUNNING";
        else if (action === "maintenance") s.status = "MAINTENANCE";
        else if (action === "stop") {
          s.status = "STOPPED";
          s.stopTime = new Date().toISOString();
        }
        else if (action === "load") {
          const catName = prev.products.find(p => p.category.id === s.currentCategoryId)?.category.name || "";
          const pThick = prev.products.find(p => p.thickness.id === s.currentThicknessId)?.thickness.value || 0;
          const pSize = prev.products.find(p => p.size.id === s.currentSizeId)?.size || { length: 0, width: 0, label: "" };
          
          s.entries = [...s.entries, {
            id: `temp-${Date.now()}`,
            type: extra.type as "COOK" | "REPRESS",
            loadTime: new Date().toISOString(),
            unloadTime: null,
            quantity: s.numDaylights,
            notes: null,
            createdAt: new Date().toISOString(),
            category: { id: s.currentCategoryId!, name: catName },
            thickness: { id: s.currentThicknessId!, value: pThick },
            size: { id: s.currentSizeId!, ...pSize }
          }];
        }
        else if (action === "unload") {
          s.entries = s.entries.map(e => 
            e.id === extra.entryId ? { ...e, unloadTime: new Date().toISOString() } : e
          );
        }
        else if (action === "glue") {
          s.glueEntries = [...s.glueEntries, {
            id: `temp-${Date.now()}`,
            time: new Date().toISOString(),
            barrels: extra.barrels
          }];
        }
        return { ...prev, activeSession: s };
      });

      const res = await fetch("/api/hotpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      
      if (res.ok) {
        fetchData(); // Silently sync background
      } else {
        const err = await res.json();
        alert(err.error || "Action failed");
        fetchData(); // Rollback UI if failed
      }
    } catch { 
      alert("Network error"); 
      fetchData(); // Rollback UI
    }
    finally { setActionLoading(false); }
  };

  // Timer countdown effect
  useEffect(() => {
    const checkTimer = () => {
      const stored = localStorage.getItem("crply_hotpress_timer");
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (parsed.endTime && parsed.type && parsed.totalSecs) {
          const remaining = Math.max(0, Math.floor((parsed.endTime - Date.now()) / 1000));
          
          if (timerType !== parsed.type) setTimerType(parsed.type);
          if (timerTotal !== parsed.totalSecs) setTimerTotal(parsed.totalSecs);
          setTimerRemaining(remaining);
          
          if (remaining <= 0 && !parsed.expiredHandled) {
            setTimerExpired(true);
            if (!alarmPlayed.current) {
              alarmPlayed.current = true;
              try {
                const ctx = new AudioContext();
                const playBeep = (freq: number, delay: number) => {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.frequency.value = freq;
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  gain.gain.value = 0.3;
                  osc.start(ctx.currentTime + delay);
                  osc.stop(ctx.currentTime + delay + 0.2);
                };
                playBeep(880, 0); playBeep(880, 0.3); playBeep(1100, 0.6);
              } catch {}
            }
            // Mark as handled so alarm doesn't repeat on reload
            localStorage.setItem("crply_hotpress_timer", JSON.stringify({ ...parsed, expiredHandled: true }));
          } else if (remaining <= 0) {
            setTimerExpired(true);
          } else {
            setTimerExpired(false);
          }
        }
      } catch {}
    };

    checkTimer();
    timerRef.current = setInterval(checkTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerType, timerTotal]);

  // Start timer helper
  const startTimer = (type: "cook" | "cool", durationMinutes: number) => {
    const totalSecs = Math.round(durationMinutes * 60);
    const endTime = Date.now() + totalSecs * 1000;
    
    setTimerType(type);
    setTimerTotal(totalSecs);
    setTimerRemaining(totalSecs);
    setTimerExpired(false);
    alarmPlayed.current = false;
    
    localStorage.setItem("crply_hotpress_timer", JSON.stringify({
      type,
      endTime,
      totalSecs,
      expiredHandled: false
    }));
  };
  
  const dismissTimer = () => {
    setTimerType(null);
    setTimerRemaining(0);
    setTimerExpired(false);
    localStorage.removeItem("crply_hotpress_timer");
  };

  // Get timing for current product
  const getCurrentTiming = () => {
    if (!data || !sess?.currentCategoryId || !sess?.currentThicknessId) return null;
    const timings = (data as any).productTimings || [];
    return timings.find((t: any) => t.categoryId === sess.currentCategoryId && t.thicknessId === sess.currentThicknessId);
  };

  if (status === "loading" || !session?.user || assignmentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
      </div>
    );
  }

  if (!assigned) {
    return <MachineRequiredScreen error={assignmentError} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-slate-400 flex flex-col items-center gap-3">
              <Flame className="animate-pulse text-orange-500" size={40} />
              <p>Loading machine log...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const sess = data?.activeSession;
  const isRunning = sess && ["RUNNING", "PAUSED", "MAINTENANCE"].includes(sess.status);
  const isCooking = sess?.entries.some(e => e.loadTime && !e.unloadTime);
  const cookingEntry = sess?.entries.find(e => e.loadTime && !e.unloadTime);

  // Calculate stats
  const cooks = sess?.entries.filter(e => e.type === "COOK" && e.unloadTime) || [];
  const represses = sess?.entries.filter(e => e.type === "REPRESS" && e.unloadTime) || [];
  const totalSheets = sess?.entries.filter(e => e.unloadTime).reduce((s, e) => s + e.quantity, 0) || 0;
  const totalGlue = sess?.glueEntries.reduce((s, e) => s + e.barrels, 0) || 0;

  // Product selection helpers
  const products = data?.products || [];
  const categories = [...new Map(products.map(p => [p.category.id, p.category])).values()].sort((a, b) => a.sortOrder - b.sortOrder);

  const pickCategory = (catId: string) => { setPickCat(catId); setPickStep("thickness"); };
  const pickThickness = (thId: string) => { setPickThick(thId); setPickStep("size"); };
  const pickSize = async (sizeId: string) => {
    if (!sess) return;
    await doAction("setProduct", { sessionId: sess.id, categoryId: pickCat, thicknessId: pickThick, sizeId });
    setShowProductPicker(false);
    setPickStep("category");
    setPickCat(null);
    setPickThick(null);
  };

  const pickProdListItem = async (item: any) => {
    if (!sess) return;
    await doAction("setProduct", { 
      sessionId: sess.id, 
      categoryId: item.categoryId, 
      thicknessId: item.thicknessId, 
      sizeId: item.sizeId, 
      productionListItemId: item.id 
    });
    setShowProductPicker(false);
  };

  const getFilteredThicknesses = () => {
    const ts = products.filter(p => p.category.id === pickCat).map(p => p.thickness);
    return [...new Map(ts.map(t => [t.id, t])).values()].sort((a, b) => b.value - a.value);
  };

  const getFilteredSizes = () => {
    const ss = products.filter(p => p.category.id === pickCat && p.thickness.id === pickThick).map(p => p.size);
    return [...new Map(ss.map(s => [s.id, s])).values()].sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;
      return b.width - a.width;
    });
  };

  // Current product display
  const currentProduct = (() => {
    if (!sess?.currentCategoryId || !sess?.currentThicknessId || !sess?.currentSizeId) return null;
    const p = products.find(
      pp => pp.category.id === sess.currentCategoryId &&
        pp.thickness.id === sess.currentThicknessId &&
        pp.size.id === sess.currentSizeId
    );
    return p ? `${p.category.name} • ${p.thickness.value}mm • ${p.size.length}×${p.size.width}` : null;
  })();

  // Running totals tracker per thickness+size for display
  const buildRunningTotals = (entries: PressEntry[]) => {
    const totals: Record<string, number> = {};
    return entries.filter(e => e.unloadTime).map(e => {
      if (e.type === "COOK") {
        const key = `${e.thickness.value}|${e.size.length}x${e.size.width}`;
        totals[key] = (totals[key] || 0) + e.quantity;
        return { ...e, runningTotal: totals[key] };
      }
      return { ...e, runningTotal: null };
    });
  };

  // ==================== MACHINE OFF STATE ====================
  if (!isRunning) {
    return (
      <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Hot Press</h1>
            <p className="text-slate-400 text-sm">Machine is OFF</p>
          </div>
        </div>

        {/* Start button */}
        <LongPressButton
          onComplete={() => doAction("start")}
          className="w-full py-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xl font-bold rounded-2xl shadow-lg shadow-emerald-900/50 hover:shadow-emerald-800/60 transition-all"
        >
          <Power size={28} />
          Start Machine
        </LongPressButton>

        {/* Today's stopped sessions / submitted logs */}
        {data?.todaySessions && data.todaySessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Today&apos;s Sessions</h2>
            {data.todaySessions.map(s => (
              <SessionCard key={s.id} session={s} onSubmit={() => doAction("operatorSubmit", { sessionId: s.id })} products={products} />
            ))}
          </div>
        )}
      </div>
      </main>
      </div>
    );
  }

  // ==================== MACHINE RUNNING STATE ====================
  return (
    <div className="min-h-screen bg-slate-950">
    <Sidebar user={session.user} />
    <main className="ml-0 md:ml-64 p-3 md:p-8">
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hot Press
              <span className={`ml-3 text-xs px-2 py-1 rounded-full ${
                sess.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-400" :
                sess.status === "PAUSED" ? "bg-amber-500/20 text-amber-400" :
                "bg-orange-500/20 text-orange-400"
              }`}>
                {sess.status}
              </span>
            </h1>
            <p className="text-slate-400 text-sm">Started {fmt(sess.startTime)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-amber-400">{totalSheets}</p>
          <p className="text-xs text-slate-500">sheets</p>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Cooks", value: cooks.length },
          { label: "Repress", value: represses.length, color: "text-amber-400" },
          { label: "Glue Bbl", value: totalGlue, color: "text-cyan-400" },
          { label: "Daylights", value: sess.numDaylights },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color || "text-white"}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Current Product */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">PRODUCING</p>
          <p className="text-lg font-bold text-white">{currentProduct || "No product selected"}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-400">Qty per cook:</p>
            {editingDaylights ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={daylightsVal}
                  onChange={e => setDaylightsVal(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                  min={1}
                />
                <button onClick={async () => {
                  await doAction("setDaylights", { sessionId: sess.id, numDaylights: daylightsVal });
                  setEditingDaylights(false);
                }} className="text-emerald-400 hover:text-emerald-300"><Check size={16} /></button>
                <button onClick={() => setEditingDaylights(false)} className="text-slate-400 hover:text-slate-300"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => { setDaylightsVal(sess.numDaylights); setEditingDaylights(true); }}
                className="text-white font-bold flex items-center gap-1 hover:text-blue-400">
                {sess.numDaylights} <Edit3 size={12} className="text-slate-500" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => { setShowProductPicker(true); setPickStep("category"); setPickCat(null); setPickThick(null); }}
          className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-600 transition"
        >
          Change
        </button>
      </div>

      {/* Timer Display */}
      {timerType && (timerRemaining > 0 || timerExpired) && (
        <div className={`rounded-2xl p-4 border ${
          timerExpired 
            ? "bg-red-500/10 border-red-500/40 animate-pulse" 
            : timerType === "cook" 
              ? "bg-orange-500/10 border-orange-500/30" 
              : "bg-blue-500/10 border-blue-500/30"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {timerExpired ? (
                <AlertTriangle size={18} className="text-red-400" />
              ) : timerType === "cook" ? (
                <Flame size={18} className="text-orange-400" />
              ) : (
                <Clock size={18} className="text-blue-400" />
              )}
              <span className={`text-xs font-black uppercase tracking-widest ${
                timerExpired ? "text-red-400" : timerType === "cook" ? "text-orange-400" : "text-blue-400"
              }`}>{timerExpired ? "TIME'S UP!" : timerType === "cook" ? "COOKING TIMER" : "COOLING TIMER"}</span>
            </div>
            <button onClick={dismissTimer}
              className="text-slate-500 text-[10px] font-bold hover:text-white">DISMISS</button>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-black tracking-tight ${
              timerExpired ? "text-red-400" : "text-white"
            }`}>
              {timerExpired ? "00:00" : `${String(Math.floor(timerRemaining / 60)).padStart(2, "0")}:${String(timerRemaining % 60).padStart(2, "0")}`}
            </p>
            {!timerExpired && timerTotal > 0 && (
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${
                  timerType === "cook" ? "bg-orange-500" : "bg-blue-500"
                }`} style={{ width: `${((timerTotal - timerRemaining) / timerTotal) * 100}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {sess.status === "RUNNING" && !isCooking && (
        <>
          <LongPressButton
            onComplete={async () => {
              await doAction("load", { sessionId: sess.id, type: "COOK" });
              const timing = getCurrentTiming();
              if (timing && timing.cookingTime > 0) startTimer("cook", timing.cookingTime);
            }}
            disabled={!currentProduct}
            className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Flame size={24} /> <ArrowDown size={20} /> LOAD (Cook)
          </LongPressButton>

          <LongPressButton
            onComplete={async () => {
              await doAction("load", { sessionId: sess.id, type: "REPRESS" });
              const timing = getCurrentTiming();
              if (timing && timing.cookingTime > 0) startTimer("cook", timing.cookingTime);
            }}
            disabled={!currentProduct}
            className="w-full py-4 bg-gradient-to-r from-yellow-700 to-amber-700 text-white text-lg font-bold rounded-2xl shadow-lg disabled:opacity-50"
          >
            <RotateCcw size={20} /> REPRESS
          </LongPressButton>
        </>
      )}

      {/* Cooking in progress */}
      {isCooking && cookingEntry && (
        <LongPressButton
          onComplete={async () => {
            await doAction("unload", { entryId: cookingEntry.id });
            const timing = getCurrentTiming();
            if (timing && timing.coolingTime > 0) startTimer("cool", timing.coolingTime);
          }}
          className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-900/50 animate-pulse"
        >
          <ArrowUp size={24} /> UNLOAD ({cookingEntry.type === "REPRESS" ? "Repress" : "Cook"})
          <span className="text-sm font-normal ml-2">loaded {fmt(cookingEntry.loadTime)}</span>
        </LongPressButton>
      )}

      {/* Glue Button */}
      {showGlueInput ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <Droplets size={20} className="text-cyan-400" />
          <input
            type="number"
            value={glueBarrels}
            onChange={e => setGlueBarrels(parseFloat(e.target.value) || 1)}
            className="w-20 px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-white text-center"
            min={1}
            step={1}
          />
          <span className="text-slate-400 text-sm">barrels</span>
          <LongPressButton
            onComplete={async () => { await doAction("glue", { sessionId: sess.id, barrels: glueBarrels }); setShowGlueInput(false); }}
            className="ml-auto px-12 py-2 bg-cyan-600 text-white rounded-xl text-sm font-bold"
          >Add</LongPressButton>
          <button onClick={() => setShowGlueInput(false)} className="text-slate-400"><X size={18} /></button>
        </div>
      ) : (
        <button
          onClick={() => setShowGlueInput(true)}
          className="w-full py-4 bg-gradient-to-r from-cyan-800 to-teal-800 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <Droplets size={20} /> Glue ({totalGlue} bbl)
        </button>
      )}

      {/* Pause / Maintenance / Stop */}
      <div className="grid grid-cols-3 gap-2">
        {sess.status === "RUNNING" ? (
          <LongPressButton onComplete={() => doAction("pause", { sessionId: sess.id })}
            className="py-3 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-xl text-sm font-bold">
            <Pause size={16} /> Pause
          </LongPressButton>
        ) : (
          <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
            className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-sm font-bold">
            <Play size={16} /> Resume
          </LongPressButton>
        )}
        {sess.status !== "MAINTENANCE" ? (
          <LongPressButton onComplete={() => doAction("maintenance", { sessionId: sess.id })}
            className="py-3 bg-orange-900/50 border border-orange-700/50 text-orange-300 rounded-xl text-sm font-bold">
            <Wrench size={16} /> Maint.
          </LongPressButton>
        ) : (
          <LongPressButton onComplete={() => doAction("resume", { sessionId: sess.id })}
            className="py-3 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-xl text-sm font-bold">
            <Play size={16} /> Resume
          </LongPressButton>
        )}
        <LongPressButton onComplete={() => doAction("stop")}
          disabled={!!isCooking}
          className={`py-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl text-sm font-bold ${isCooking ? "opacity-30 cursor-not-allowed" : ""}`}>
          <PowerOff size={16} /> Stop
        </LongPressButton>
      </div>
      {isCooking && (
        <p className="text-center text-amber-400/70 text-xs">⚠️ Unload the press before stopping.</p>
      )}

      {/* ==================== PRODUCTION LOG ==================== */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full px-4 py-3 flex items-center justify-between text-white font-bold"
        >
          <span>Production Log</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{sess.entries.length} entries</span>
            {showLog ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {showLog && (
          <div className="px-2 pb-3">
            {/* Start row */}
            <div className="mx-2 mb-1 py-2 px-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg flex justify-between items-center">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <Power size={14} /> START
              </span>
              <span className="text-xs text-slate-300">{fmt(sess.startTime)}</span>
            </div>

            {/* Entries in a table-like format */}
            <div className="mx-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50">
                    <th className="text-left py-2 px-1 font-medium">#</th>
                    <th className="text-left py-2 px-1 font-medium">Type</th>
                    <th className="text-left py-2 px-1 font-medium">Thickness</th>
                    <th className="text-left py-2 px-1 font-medium">Size</th>
                    <th className="text-left py-2 px-1 font-medium">Load</th>
                    <th className="text-left py-2 px-1 font-medium">Unload</th>
                    <th className="text-right py-2 px-1 font-medium">Qty</th>
                    <th className="text-right py-2 px-1 font-medium">Total</th>
                    <th className="text-right py-2 px-1 font-medium">Cook Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Build running totals per thickness+size for COOK entries
                    const totals: Record<string, number> = {};
                    const allEntries = sess.entries;

                    return allEntries.map((entry, idx) => {
                      let runTotal: number | null = null;
                      if (entry.type === "COOK" && entry.unloadTime) {
                        const key = `${entry.thickness.value}|${entry.size.length}x${entry.size.width}`;
                        totals[key] = (totals[key] || 0) + entry.quantity;
                        runTotal = totals[key];
                      }

                      // Cooling time (between this unload → next load)
                      const nextEntry = allEntries[idx + 1];
                      const cooling = (entry.unloadTime && nextEntry?.loadTime)
                        ? coolingTime(entry, nextEntry) : null;

                      const isCookingNow = entry.loadTime && !entry.unloadTime;

                      return (
                        <React.Fragment key={entry.id}>
                          <tr className={`border-b border-slate-700/30 ${
                            entry.type === "REPRESS" ? "bg-amber-900/10" :
                            isCookingNow ? "bg-blue-900/20 animate-pulse" : ""
                          }`}>
                            <td className="py-2 px-1 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-1">
                              {entry.type === "REPRESS" ? (
                                <span className="text-amber-400 flex items-center gap-1"><RotateCcw size={10} /> R</span>
                              ) : (
                                <span className="text-emerald-400 flex items-center gap-1"><Flame size={10} /> C</span>
                              )}
                            </td>
                            <td className="py-2 px-1 text-white font-medium">{entry.thickness.value}mm</td>
                            <td className="py-2 px-1 text-slate-300">{entry.size.length}×{entry.size.width}</td>
                            <td className="py-2 px-1 text-slate-300">{fmt(entry.loadTime)}</td>
                            <td className="py-2 px-1 text-slate-300">{isCookingNow ? (
                              <span className="text-blue-400 animate-pulse">cooking...</span>
                            ) : fmt(entry.unloadTime)}</td>
                            <td className="py-2 px-1 text-right">
                              {editingQty === entry.id ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <input type="number" value={qtyVal} onChange={e => setQtyVal(parseInt(e.target.value) || 0)}
                                    className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs text-center" min={0} />
                                  <button onClick={async () => {
                                    await doAction("updateQuantity", { entryId: entry.id, quantity: qtyVal });
                                    setEditingQty(null);
                                  }} className="text-emerald-400"><Check size={12} /></button>
                                  <button onClick={() => setEditingQty(null)} className="text-slate-400"><X size={12} /></button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingQty(entry.id); setQtyVal(entry.quantity); }}
                                  className="text-white font-bold hover:text-blue-400">{entry.quantity}</button>
                              )}
                            </td>
                            <td className="py-2 px-1 text-right text-amber-400 font-bold">
                              {entry.type === "COOK" && runTotal !== null ? `Σ${runTotal}` : entry.type === "REPRESS" ? `${entry.quantity}` : ""}
                            </td>
                            <td className="py-2 px-1 text-right text-cyan-400">
                              {cookingTime(entry)}
                            </td>
                          </tr>
                          {/* Cooling time row */}
                          {cooling && (
                            <tr>
                              <td colSpan={9} className="text-center py-0.5">
                                <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                                  <Timer size={8} /> cooling {cooling}
                                </span>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Glue entries */}
            {sess.glueEntries.map(g => (
              <div key={g.id} className="mx-2 mt-1 py-1.5 px-3 bg-cyan-900/20 border border-cyan-700/20 rounded-lg flex justify-between items-center">
                <span className="text-cyan-400 text-xs flex items-center gap-2">
                  <Droplets size={12} /> Glue: {g.barrels} barrel(s)
                </span>
                <span className="text-xs text-slate-400">{fmt(g.time)}</span>
              </div>
            ))}

            {/* Pause events */}
            {sess.pauseEvents.map(p => (
              <div key={p.id} className="mx-2 mt-1 py-1.5 px-3 bg-amber-900/20 border border-amber-700/20 rounded-lg flex justify-between items-center">
                <span className="text-amber-400 text-xs flex items-center gap-2">
                  {p.type === "MAINTENANCE" ? <Wrench size={12} /> : <Pause size={12} />}
                  {p.type}
                </span>
                <span className="text-xs text-slate-400">{fmt(p.startTime)} → {p.endTime ? fmt(p.endTime) : "ongoing"}</span>
              </div>
            ))}

            {/* Stop row (if applicable) */}
            {sess.stopTime && (
              <div className="mx-2 mt-1 py-2 px-3 bg-red-900/30 border border-red-700/30 rounded-lg flex justify-between items-center">
                <span className="text-red-400 font-bold flex items-center gap-2"><PowerOff size={14} /> STOP</span>
                <span className="text-xs text-slate-300">{fmt(sess.stopTime)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowProductPicker(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">Select Product</h3>
              <button onClick={() => setShowProductPicker(false)} className="text-slate-400 p-2"><X size={20} /></button>
            </div>
            
            <div className="flex border-b border-slate-700 w-full shrink-0">
              <button onClick={() => setPickMode("productionLists")}
                className={`flex-1 py-3 text-sm font-bold transition ${pickMode === "productionLists" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/10" : "text-slate-400 hover:bg-slate-700/50"}`}>
                From Production Lists
              </button>
              <button onClick={() => setPickMode("catalog")}
                className={`flex-1 py-3 text-sm font-bold transition ${pickMode === "catalog" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/10" : "text-slate-400 hover:bg-slate-700/50"}`}>
                From Catalog (Ad-hoc)
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto grow">
              {pickMode === "productionLists" ? (
                <div className="space-y-4">
                  {data?.productionLists?.map(list => (
                    <div key={list.id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-widest font-black text-xs">
                          {list.order?.customer?.name || "NAME"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-[10px] uppercase tracking-wider opacity-70">List #{list.listNumber}</span>
                          {list.order && (
                            <span className="text-blue-400 text-[10px] font-black bg-blue-900/20 px-2 py-0.5 rounded border border-blue-800/30 uppercase">
                              #{list.order.orderNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        {list.items.map((item: any) => {
                          const donePct = Math.min(100, Math.round((item.producedQuantity / item.quantity) * 100)) || 0;
                          return (
                            <button key={item.id} onClick={() => pickProdListItem(item)}
                              className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-lg transition active:scale-[0.98] group flex justify-between items-center">
                              <div>
                                <p className="text-white font-medium text-sm group-hover:text-emerald-400 transition">
                                  {item.category.name} • {item.thickness.value}mm • {item.size.length}x{item.size.width}
                                </p>
                                <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                  <span>Prod: <strong className={donePct >= 100 ? "text-emerald-400" : "text-white"}>{item.producedQuantity}</strong> / {item.quantity}</span>
                                  <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded">{donePct}%</span>
                                </p>
                              </div>
                              <CheckCircle2 size={16} className={`text-emerald-400 opacity-0 group-hover:opacity-100 transition ${donePct >= 100 ? 'opacity-50' : ''}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {(!data?.productionLists || data.productionLists.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No active production lists available.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs mb-2">
                    {pickStep === "category" ? "1. Category" : pickStep === "thickness" ? "2. Thickness" : "3. Size"}
                  </p>
                  {pickStep === "category" && categories.map(c => (
                    <button key={c.id} onClick={() => pickCategory(c.id)}
                      className="w-full py-4 px-4 bg-slate-700/50 text-white text-lg font-medium rounded-xl hover:bg-slate-700 transition text-left active:scale-[0.98]">
                      {c.name}
                    </button>
                  ))}
                  {pickStep === "thickness" && getFilteredThicknesses().map(t => (
                    <button key={t.id} onClick={() => pickThickness(t.id)}
                      className="w-full py-4 px-4 bg-slate-700/50 text-white text-lg font-medium rounded-xl hover:bg-slate-700 transition text-left active:scale-[0.98]">
                      {t.value}mm
                    </button>
                  ))}
                  {pickStep === "size" && getFilteredSizes().map(s => (
                    <button key={s.id} onClick={() => pickSize(s.id)}
                      className="w-full py-4 px-4 bg-slate-700/50 text-white text-lg font-medium rounded-xl hover:bg-slate-700 transition text-left active:scale-[0.98]">
                      {s.length} × {s.width} ({s.label})
                    </button>
                  ))}
                  {pickStep !== "category" && (
                    <button onClick={() => {
                      if (pickStep === "size") { setPickStep("thickness"); setPickThick(null); }
                      else { setPickStep("category"); setPickCat(null); }
                    }}
                      className="w-full py-3 text-slate-400 hover:text-white transition text-sm">
                      ← Back
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
    </div>
  );
}

// ==================== SESSION CARD (for stopped sessions) ====================
function SessionCard({
  session,
  onSubmit,
  products,
}: {
  session: HotPressSession;
  onSubmit: () => void;
  products: Product[];
}) {
  const [showLog, setShowLog] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const cooks = session.entries.filter(e => e.type === "COOK" && e.unloadTime);
  const represses = session.entries.filter(e => e.type === "REPRESS" && e.unloadTime);
  const totalSheets = session.entries.filter(e => e.type === "COOK" && e.unloadTime).reduce((s, e) => s + e.quantity, 0);
  const totalGlue = session.glueEntries.reduce((s, e) => s + e.barrels, 0);

  const summary = buildProductionSummary(session.entries);
  const isSubmitted = session.approvalStatus !== "PENDING";

  const statusBadge = (() => {
    switch (session.approvalStatus) {
      case "PENDING": return { text: "Draft", color: "bg-slate-500/20 text-slate-400" };
      case "SUBMITTED": return { text: "Sent to Supervisor", color: "bg-blue-500/20 text-blue-400" };
      case "SUPERVISOR_APPROVED": return { text: "With Manager", color: "bg-amber-500/20 text-amber-400" };
      case "MANAGER_APPROVED": return { text: "Approved ✓", color: "bg-emerald-500/20 text-emerald-400" };
      case "REJECTED": return { text: "Rejected", color: "bg-red-500/20 text-red-400" };
      default: return { text: session.approvalStatus, color: "bg-slate-500/20 text-slate-400" };
    }
  })();

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Session header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <span className="text-white font-bold">{fmt(session.startTime)} → {fmt(session.stopTime)}</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>{statusBadge.text}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-lg font-bold text-white">{cooks.length}</p><p className="text-[10px] text-slate-500">Cooks</p></div>
          <div><p className="text-lg font-bold text-amber-400">{represses.length}</p><p className="text-[10px] text-slate-500">Repress</p></div>
          <div><p className="text-lg font-bold text-cyan-400">{totalGlue}</p><p className="text-[10px] text-slate-500">Glue</p></div>
          <div><p className="text-lg font-bold text-emerald-400">{totalSheets}</p><p className="text-[10px] text-slate-500">Sheets</p></div>
        </div>
      </div>

      {/* Toggle buttons */}
      <div className="flex border-t border-slate-700/50">
        <button onClick={() => { setShowLog(!showLog); setShowSummary(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition ${showLog ? "text-blue-400 bg-blue-900/20" : "text-slate-400 hover:text-white"}`}>
          <Timer size={14} /> Production List
        </button>
        <button onClick={() => { setShowSummary(!showSummary); setShowLog(false); }}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-l border-slate-700/50 transition ${showSummary ? "text-emerald-400 bg-emerald-900/20" : "text-slate-400 hover:text-white"}`}>
          <Package size={14} /> Production Summary
        </button>
      </div>

      {/* Production List (detailed log) */}
      {showLog && (
        <div className="px-2 pb-3 border-t border-slate-700/30">
          {/* Start */}
          <div className="mx-2 mt-2 mb-1 py-2 px-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg flex justify-between">
            <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><Power size={14} /> START</span>
            <span className="text-xs text-slate-300">{fmt(session.startTime)}</span>
          </div>

          <div className="mx-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50">
                  <th className="text-left py-2 px-1 font-medium">#</th>
                  <th className="text-left py-2 px-1 font-medium">Type</th>
                  <th className="text-left py-2 px-1 font-medium">Thick.</th>
                  <th className="text-left py-2 px-1 font-medium">Size</th>
                  <th className="text-left py-2 px-1 font-medium">Load</th>
                  <th className="text-left py-2 px-1 font-medium">Unload</th>
                  <th className="text-right py-2 px-1 font-medium">Qty</th>
                  <th className="text-right py-2 px-1 font-medium">Total</th>
                  <th className="text-right py-2 px-1 font-medium">Cook</th>
                  <th className="text-right py-2 px-1 font-medium">Cool</th>
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
                    const nextEntry = session.entries[idx + 1];
                    const cool = (entry.unloadTime && nextEntry?.loadTime) ? coolingTime(entry, nextEntry) : "--";

                    return (
                      <tr key={entry.id} className={`border-b border-slate-700/30 ${entry.type === "REPRESS" ? "bg-amber-900/10" : ""}`}>
                        <td className="py-1.5 px-1 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-1">
                          {entry.type === "REPRESS"
                            ? <span className="text-amber-400">R</span>
                            : <span className="text-emerald-400">C</span>}
                        </td>
                        <td className="py-1.5 px-1 text-white font-medium">{entry.thickness.value}mm</td>
                        <td className="py-1.5 px-1 text-slate-300">{entry.size.length}×{entry.size.width}</td>
                        <td className="py-1.5 px-1 text-slate-300">{fmt(entry.loadTime)}</td>
                        <td className="py-1.5 px-1 text-slate-300">{fmt(entry.unloadTime)}</td>
                        <td className="py-1.5 px-1 text-right text-white font-bold">{entry.quantity}</td>
                        <td className="py-1.5 px-1 text-right text-amber-400 font-bold">
                          {entry.type === "COOK" && runTotal !== null ? `Σ${runTotal}` : ""}
                        </td>
                        <td className="py-1.5 px-1 text-right text-cyan-400">{cookingTime(entry)}</td>
                        <td className="py-1.5 px-1 text-right text-slate-500">{cool}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Glue entries */}
          {session.glueEntries.map(g => (
            <div key={g.id} className="mx-2 mt-1 py-1.5 px-3 bg-cyan-900/20 border border-cyan-700/20 rounded-lg flex justify-between items-center">
              <span className="text-cyan-400 text-xs flex items-center gap-2"><Droplets size={12} /> Glue: {g.barrels} bbl</span>
              <span className="text-xs text-slate-400">{fmt(g.time)}</span>
            </div>
          ))}

          {/* Stop */}
          <div className="mx-2 mt-1 py-2 px-3 bg-red-900/30 border border-red-700/30 rounded-lg flex justify-between">
            <span className="text-red-400 font-bold text-sm flex items-center gap-2"><PowerOff size={14} /> STOP</span>
            <span className="text-xs text-slate-300">{fmt(session.stopTime)}</span>
          </div>
        </div>
      )}

      {/* Production Summary */}
      {showSummary && (
        <div className="px-4 pb-4 border-t border-slate-700/30 space-y-3">
          <h3 className="text-sm font-bold text-white mt-3 flex items-center gap-2">
            <Package size={14} /> Production Summary
          </h3>
          {Object.entries(summary).map(([catName, thicknesses]) => (
            <div key={catName} className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
              <h4 className="text-sm font-bold text-blue-400 mb-2">{catName}</h4>
              {Object.entries(thicknesses).map(([thickLabel, items]) => (
                <div key={thickLabel} className="mb-2">
                  <p className="text-xs text-slate-400 font-medium mb-1">{thickLabel}</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-2 text-xs border-b border-slate-700/20 last:border-0">
                      <span className="text-slate-300">{item.size}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-bold">{item.totalQty} sheets</span>
                        <span className="text-slate-500">{item.cookCount} cooks</span>
                        <span className="text-cyan-400">{durStr(item.totalCookTimeMs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {/* Category total */}
              <div className="mt-1 pt-1 border-t border-slate-600/50 flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Category Total</span>
                <span className="text-emerald-400 font-bold">
                  {Object.values(thicknesses).flat().reduce((s, item) => s + item.totalQty, 0)} sheets
                </span>
              </div>
            </div>
          ))}

          {/* Grand total */}
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3 flex justify-between items-center">
            <span className="text-white font-bold">Total Production</span>
            <span className="text-2xl font-black text-emerald-400">{totalSheets} sheets</span>
          </div>

          {/* Repress summary if any */}
          {represses.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
              <h4 className="text-sm font-bold text-amber-400 mb-1">Represses</h4>
              <p className="text-xs text-slate-300">{represses.length} repress cycles, {represses.reduce((s, e) => s + e.quantity, 0)} boards</p>
            </div>
          )}

          {/* Glue summary */}
          {totalGlue > 0 && (
            <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-xl p-3 flex justify-between items-center">
              <span className="text-cyan-400 font-bold text-sm flex items-center gap-2"><Droplets size={14} /> Glue Used</span>
              <span className="text-white font-bold">{totalGlue} barrels</span>
            </div>
          )}
        </div>
      )}

      {/* Submit button — only if PENDING */}
      {!isSubmitted && (
        <div className="p-4 border-t border-slate-700/30">
          <button
            onClick={onSubmit}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Send size={20} /> Verify & Send to Supervisor
          </button>
        </div>
      )}
    </div>
  );
}

// Need React for Fragment
import React from "react";
