"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Plus, Trash2, Send, CheckCircle, Clock, AlertTriangle, 
  Package, ListChecks, Star, X, ChevronDown, ChevronUp, History, Check,
  Flame, Gauge
} from "lucide-react";

export default function HotPressOperatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [allProdLists, setAllProdLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [machineInfo, setMachineInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, e, lists, assignment] = await Promise.all([
        fetch("/api/company-products").then((r) => r.json()),
        fetch("/api/production-entries").then((r) => r.json()),
        fetch("/api/production-lists").then((r) => r.json()),
        fetch("/api/operator/assignment").then((r) => r.json()),
      ]);

      if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
      if (e.entries) setEntries(e.entries);
      if (e.dailyLog) setDailyLog(e.dailyLog);
      
      const listData = lists && Array.isArray(lists.lists) ? lists.lists : (Array.isArray(lists) ? lists : []);
      setAllProdLists(listData);
      
      if (assignment?.machine) {
        setMachineInfo(assignment.machine);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status]);

  const totalToday = entries.reduce((sum, e) => sum + e.quantity, 0);
  const currentStatus = dailyLog?.status || "PENDING";

  const statusColors: Record<string, { text: string; bg: string; label: string }> = {
    PENDING: { text: "text-slate-300", bg: "bg-slate-500/20", label: "Not Submitted" },
    SUBMITTED: { text: "text-amber-300", bg: "bg-amber-500/20", label: "Waiting for Supervisor" },
    SUPERVISOR_APPROVED: { text: "text-blue-300", bg: "bg-blue-500/20", label: "Waiting for Manager" },
    MANAGER_APPROVED: { text: "text-emerald-300", bg: "bg-emerald-500/20", label: "Approved ✓" },
    REJECTED: { text: "text-red-300", bg: "bg-red-500/20", label: "Rejected — Re-submit" },
  };

  const sc = statusColors[currentStatus];

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session?.user as any} />
      <main className="ml-0 md:ml-64 p-4 md:p-8 pt-6">
        {/* Header with Machine Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">
                {machineInfo?.section?.name || "HOT PRESS"}
              </span>
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">
                {machineInfo?.code || "NA"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              <Flame size={28} className="text-orange-500" />
              {machineInfo?.name || "Hot Press Machine"}
            </h1>
            <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest">
              Shift Operations • {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          
          <div className={`px-5 py-3 ${sc.bg} border border-slate-700/50 rounded-2xl flex items-center gap-3 shadow-xl backdrop-blur-sm`}>
            {currentStatus === "MANAGER_APPROVED" ? <CheckCircle size={24} className="text-emerald-400" /> :
             currentStatus === "REJECTED" ? <AlertTriangle size={24} className="text-red-400" /> :
             <Clock size={24} className={sc.text} />}
            <div>
              <p className={`${sc.text} font-black text-xs uppercase tracking-tighter`}>{sc.label}</p>
              <p className="text-slate-400 text-[10px] font-bold">TOTAL: {totalToday} sheets logged</p>
            </div>
          </div>
        </div>

        {/* Existing Hot Press Log Components (Simplified for structure) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Gauge size={18} className="text-orange-400" /> Current Dashboard
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push("/operator/hotpress/log")}
                    className="px-4 py-2 bg-orange-600 shadow-lg shadow-orange-900/20 text-white font-black text-[10px] rounded-xl active:scale-95 transition flex items-center gap-2"
                  >
                    <Plus size={14} /> LOG MACHINE ACTION
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                 {entries.length === 0 ? (
                   <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                     <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No production entries today</p>
                   </div>
                 ) : (
                   entries.map(e => (
                    <div key={e.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center font-black text-orange-400">
                          {e.quantity}
                        </div>
                        <div>
                          <p className="text-white font-bold text-xs uppercase">{e.product?.category?.name} • {e.product?.thickness?.value}mm</p>
                          <p className="text-slate-500 text-[10px]">{e.product?.size?.label}</p>
                        </div>
                      </div>
                    </div>
                   ))
                 )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
               <h2 className="text-white font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                 <ListChecks size={18} className="text-blue-400" /> Active Lists
               </h2>
               <div className="space-y-3">
                 {allProdLists.slice(0, 5).map(list => (
                   <div key={list.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
                     <p className="text-white font-bold text-xs uppercase mb-1">{list.order?.customer?.name || "STOCK"}</p>
                     <p className="text-[10px] text-slate-500 font-black">{list.listNumber}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
