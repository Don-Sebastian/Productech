"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, Flame, TreePine, Wind, Scissors, Pause,
  Power, PowerOff, Activity, AlertCircle, Maximize2,
  Minimize2, ArrowUp, ArrowDown, User
} from "lucide-react";

interface LiveSession {
  id: string;
  section: string;
  sectionLabel: string;
  status: string;
  startTime: string;
  stopTime: string | null;
  shiftDate: string;
  operator?: { id: string; name: string };
  machine?: { id: string; name: string; code: string };
  isActive: boolean;
  isCooking?: boolean;
  cookingEntry?: {
    type: string;
    loadTime: string;
    category: string;
    thickness: number;
    size: string;
  } | null;
  activeBatch?: {
    veneerThickness: number;
    loadTime: string;
    quantity: number;
  } | null;
  stats: Record<string, number | any>;
  entries: any[];
  pauseEvents: any[];
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
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export default function LiveProductionView() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Real-time durations
  const [now, setNow] = useState(Date.now());

  const fetchLiveLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs/machine/live");
      if (res.ok) {
        const d = await res.json();
        setSessions(d.sessions || []);
        setError(null);
        setLastUpdated(new Date());
      } else {
        const d = await res.json();
        setError(d.error || "Failed to fetch live logs");
      }
    } catch (err) {
      setError("Network error fetching live logs");
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 10 seconds for DB updates
  useEffect(() => {
    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveLogs]);

  // Update real-time counters every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-700/50">
        <Activity className="animate-pulse text-emerald-500 mb-3" size={32} />
        <p className="text-slate-400">Loading live production data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-900/10 border border-red-500/20 rounded-2xl">
        <AlertCircle className="text-red-500 mb-2" size={32} />
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={fetchLiveLogs} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">Retry</button>
      </div>
    );
  }

  const activeCount = sessions.filter(s => s.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Live Production</h2>
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
            {activeCount} Active
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="p-8 bg-slate-800/30 border border-slate-700/30 rounded-2xl text-center">
          <p className="text-slate-400">No active production sessions today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map(s => (
            <LiveCard key={`${s.section}-${s.id}`} session={s} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ LIVE CARD ============

function LiveCard({ session, now }: { session: LiveSession; now: number }) {
  const [expanded, setExpanded] = useState(false);
  
  // Base styling per section
  let sc = { bg: "bg-slate-800", ring: "ring-slate-700", icon: Clock, color: "text-slate-400" };
  if (session.section === "hotpress") sc = { bg: "bg-orange-900/20", ring: "ring-orange-500/30", icon: Flame, color: "text-orange-400" };
  if (session.section === "peeling") sc = { bg: "bg-green-900/20", ring: "ring-green-500/30", icon: TreePine, color: "text-green-400" };
  if (session.section === "dryer") sc = { bg: "bg-cyan-900/20", ring: "ring-cyan-500/30", icon: Wind, color: "text-cyan-400" };
  if (session.section === "finishing") sc = { bg: "bg-purple-900/20", ring: "ring-purple-500/30", icon: Scissors, color: "text-purple-400" };

  const Icon = sc.icon;

  // Real-time duration string
  const durationMs = session.stopTime 
    ? new Date(session.stopTime).getTime() - new Date(session.startTime).getTime()
    : now - new Date(session.startTime).getTime();
    
  return (
    <div className={`relative flex flex-col rounded-2xl border ${session.isActive ? `border-${sc.color.split('-')[1]}-500/50 shadow-lg shadow-${sc.color.split('-')[1]}-900/20` : 'border-slate-700/50'} bg-slate-900/80 overflow-hidden transition-all duration-300`}>
      
      {/* Top Banner indicating status */}
      <div className={`h-1.5 w-full ${session.isActive ? (session.status === 'PAUSED' ? 'bg-amber-500 line-pulse' : `bg-${sc.color.split('-')[1]}-500`) : 'bg-slate-700'}`} />

      <div className="p-4 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-1 ${sc.color}`}>
              <Icon size={14} />
              {session.sectionLabel}
              {session.machine && <span className="ml-1 px-1.5 py-0.5 bg-slate-800 text-white rounded">{session.machine.name}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium text-sm">
              <User size={14} className="text-slate-400" />
              {session.operator?.name || 'Unknown Operator'}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 border ${
              session.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              session.status === 'PAUSED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
              session.status === 'MAINTENANCE' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
              session.status === 'STOPPED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {session.status === 'RUNNING' && <Activity size={10} className="animate-pulse" />}
              {session.status === 'PAUSED' && <Pause size={10} />}
              {session.status === 'STOPPED' && <PowerOff size={10} />}
              {session.status}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono tracking-tighter">
              {durStr(durationMs)}
            </div>
          </div>
        </div>

        {/* Section Specific Live Content */}
        <div className="mt-4 mb-2">
          {session.section === "hotpress" && <HotPressLive session={session} now={now} />}
          {session.section === "peeling" && <PeelingLive session={session} />}
          {session.section === "dryer" && <DryerLive session={session} now={now} />}
          {session.section === "finishing" && <FinishingLive session={session} />}
        </div>
      </div>

      {session.entries?.length > 0 && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-xs font-bold text-slate-400 transition flex items-center justify-center gap-1 border-t border-slate-700/50"
        >
          {expanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>} 
          {expanded ? "HIDE LATEST ACTIVITY" : "VIEW LATEST ACTIVITY"}
        </button>
      )}

      {expanded && session.entries?.length > 0 && (
        <div className="bg-slate-950 p-3 border-t border-slate-800 max-h-48 overflow-y-auto">
           {/* Rendering just the last 3-4 entries for brevity in live view */}
           <div className="space-y-1.5">
             {session.entries.slice(-4).reverse().map((e, idx) => (
               <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg text-xs">
                 <div className="text-slate-300 truncate pr-2">
                   {session.section === 'hotpress' && (
                     <><span className={e.type === 'REPRESS' ? 'text-amber-400' : 'text-emerald-400'}>{e.type.charAt(0)}</span> • {e.category?.name} • {e.thickness?.value}mm • {e.size?.length}x{e.size?.width}</>
                   )}
                   {session.section === 'peeling' && (
                     <>{e.peelingMaterial?.treeType} • {e.peelingMaterial?.veneerThickness}mm</>
                   )}
                   {session.section === 'dryer' && (
                     <>{e.veneerThickness}mm Batch</>
                   )}
                   {session.section === 'finishing' && (
                     <>{e.category?.name} • {e.thickness?.value}mm • {e.size?.label}</>
                   )}
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                   <div className="text-right">
                     <span className="font-bold text-white block">{e.quantity} {session.section==='peeling'&&'sht'}</span>
                     <span className="text-[9px] text-slate-500">{fmt(e.unloadTime || e.timestamp)}</span>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}

// === Section Specific Mini-Widgets ===

function HotPressLive({ session, now }: { session: LiveSession, now: number }) {
  const { isCooking, cookingEntry, stats } = session;
  
  return (
    <div>
      {/* Current Action Highlight */}
      <div className={`p-3 rounded-xl border mb-3 flex items-center justify-between ${
        isCooking 
          ? 'bg-blue-900/20 border-blue-500/30' 
          : 'bg-slate-800/40 border-slate-700/50'
      }`}>
        {isCooking && cookingEntry ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Press Active</p>
                <p className="text-sm font-medium text-white truncate max-w-[120px]" title={`${cookingEntry.category} ${cookingEntry.thickness}mm`}>
                  {cookingEntry.thickness}mm {cookingEntry.type === 'REPRESS' ? 'Repress' : 'Cook'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">Duration</p>
              <p className="text-lg font-mono font-bold text-blue-300 tracking-tighter">
                {durStr(now - new Date(cookingEntry.loadTime).getTime())}
              </p>
            </div>
          </>
        ) : session.isActive ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Power className="text-slate-500" size={16} />
            <span className="text-sm">Machine idle. Waiting to load press.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <PowerOff size={16} />
            <span className="text-sm">Machine Stopped.</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white leading-none">{stats.totalCooks + stats.totalRepresses}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">Presses</p>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-emerald-400 leading-none">{stats.totalSheets}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">Sheets</p>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-cyan-400 leading-none">{stats.totalGlue}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">Glue(bbl)</p>
        </div>
      </div>
    </div>
  );
}

function PeelingLive({ session }: { session: LiveSession }) {
  const { stats } = session;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <TreePine size={20} className="text-amber-500/50 absolute top-2 right-2"/>
            <p className="text-2xl font-black text-emerald-400">{stats.totalSheets}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sheets Peeled</p>
         </div>
         <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <p className="text-2xl font-black text-amber-400">{stats.totalLogs}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Logs Used</p>
         </div>
      </div>
    </div>
  );
}

function DryerLive({ session, now }: { session: LiveSession, now: number }) {
  const { activeBatch, stats } = session;
  
  return (
    <div>
      <div className={`p-3 rounded-xl border mb-3 flex items-center justify-between ${
        activeBatch 
          ? 'bg-cyan-900/20 border-cyan-500/30' 
          : 'bg-slate-800/40 border-slate-700/50'
      }`}>
        {activeBatch ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <div>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest leading-none mb-1">Drying Batch</p>
                <p className="text-sm font-medium text-white">
                  {activeBatch.veneerThickness}mm
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">Duration</p>
              <p className="text-lg font-mono font-bold text-cyan-300 tracking-tighter">
                {durStr(now - new Date(activeBatch.loadTime).getTime())}
              </p>
            </div>
          </>
        ) : (
          <div className="text-slate-400 text-sm">No active batch in dryer.</div>
        )}
      </div>

       <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/40 rounded-lg p-2 text-center flex justify-around">
          <div>
            <p className="text-base font-bold text-white leading-none mb-1">{stats.totalBatches}</p>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Batches</p>
          </div>
          <div className="w-px bg-slate-700 mx-2"></div>
          <div>
             <p className="text-base font-bold text-emerald-400 leading-none mb-1">{stats.totalSheets}</p>
             <p className="text-[9px] uppercase tracking-wider text-slate-500">Sheets</p>
          </div>
        </div>
        
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2 relative overflow-hidden">
          {stats.latestCheck ? (
            <div className="flex flex-col justify-center h-full">
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex justify-between">
                 <span>Latest Check</span>
                 <span>{durStr(Date.now() - new Date(stats.latestCheck.timestamp).getTime())} ago</span>
               </p>
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-300">Dryer</span> <span className="text-orange-400 font-bold">{stats.latestCheck.dryerTemp}°</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                 <span className="text-slate-300">Boiler</span> <span className="text-red-400 font-bold">{stats.latestCheck.boilerTemp}°</span>
               </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">No temp checks</div>
          )}
        </div>
      </div>
    </div>
  );
}

function FinishingLive({ session }: { session: LiveSession }) {
  const { stats } = session;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <Scissors size={20} className="text-purple-500/50 absolute top-2 right-2"/>
            <p className="text-2xl font-black text-emerald-400">{stats.totalSheets}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Finished Sheets</p>
         </div>
         <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <p className="text-2xl font-black text-white">{stats.totalEntries}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Entries</p>
         </div>
      </div>
    </div>
  );
}
