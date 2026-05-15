"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import { CheckCircle, Clock, AlertTriangle, Package, ListChecks, ChevronDown, ChevronUp, Check, CalendarClock } from "lucide-react";
import { calcListProductionMinutes, calcEstimatedDates, formatDate, formatDuration, formatDays, type PressSettings } from "@/lib/productionEstimate";
import { ListSkeleton } from "@/components/Skeleton";

export default function PressOperatorProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);
  const [products, setProducts] = useState<any[]>([]);
  const [allProdLists, setAllProdLists] = useState<any[]>([]);
  const [pressSettings, setPressSettings] = useState<PressSettings>({ workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 });
  const [productTimings, setProductTimings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/company-products").then((r) => r.json()),
      fetch("/api/production-lists").then((r) => r.json()),
    ]).then(([p, lists]) => {
      if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
      if (lists && Array.isArray(lists.lists)) {
        setAllProdLists(lists.lists);
        if (lists.pressSettings) setPressSettings(lists.pressSettings);
        if (lists.productTimings) setProductTimings(lists.productTimings);
      } else if (Array.isArray(lists)) {
        setAllProdLists(lists);
      }
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated" && assigned) fetchData(); }, [status, assigned]);

  const displayLists = useMemo(() => {
    return allProdLists.filter(l => {
      const isFinal = l.status === "COMPLETED" && (l.order ? ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(l.order.status) : true);
      return viewMode === "ACTIVE" ? !isFinal : isFinal;
    }).sort((a, b) => {
       if (a.priority !== b.priority) return a.priority - b.priority;
       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allProdLists, viewMode]);





  if (status === "loading" || !session?.user || assignmentLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400" /></div>;
  }

  if (!assigned) {
    return <MachineRequiredScreen error={assignmentError} />;
  }

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Production List</h1>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        {success && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm font-black animate-in fade-in slide-in-from-top-2">✓ {success}</div>}
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm font-black">⚠ {error}</div>}

        {/* Production Lists Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ListChecks size={14} /> Available Production Lists
            </h2>
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-0.5 flex">
              <button 
                onClick={() => setViewMode("ACTIVE")} 
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${viewMode === "ACTIVE" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                ACTIVE
              </button>
              <button 
                onClick={() => setViewMode("HISTORY")} 
                className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${viewMode === "HISTORY" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                HISTORY
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <ListSkeleton count={3} />
            ) : displayLists.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
                <Package size={32} className="mx-auto text-slate-800 mb-2" />
                <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No {viewMode.toLowerCase()} lists</p>
              </div>
            ) : displayLists.map((list) => {
              const pc = priorityConfig[list.priority] || priorityConfig[3];
              const isComplete = list.status === "COMPLETED";

              // Production time estimation
              const prodMinutes = calcListProductionMinutes(
                (list.items || []).map((i: any) => ({
                  quantity: i.quantity,
                  categoryId: i.categoryId,
                  thicknessId: i.thicknessId,
                })),
                productTimings,
                pressSettings
              );
              const hasTimings = prodMinutes > 0;
              const productionDays = prodMinutes / (pressSettings.workingHoursPerDay * 60);
              const estDates = hasTimings && list.order?.createdAt
                ? calcEstimatedDates(list.order.createdAt, prodMinutes, pressSettings)
                : null;

              return (
                <div key={list.id} className={`bg-slate-900 shadow-lg border rounded-2xl p-4 transition-all hover:bg-slate-900/80 ${
                  isComplete ? "border-emerald-500/30" : "border-slate-800"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 uppercase tracking-widest font-black text-lg">
                          {list.order?.customer?.name || "STOCK PRODUCTION"}
                        </span>
                        <span className="text-[10px] font-black text-white">{list.listNumber}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black ${pc.bg} ${pc.color}`}>{pc.label}</span>
                      </div>
                    
                     <div className="flex items-center gap-2">
                      {isComplete && (
                        <span className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-black flex items-center gap-1">
                          <Check size={12} /> COMPLETED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Production Time & Dispatch Estimates */}
                  {(hasTimings || list.estimatedProductionMinutes) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-300 font-black flex items-center gap-1 border border-orange-500/20">
                        <Clock size={10} />
                        {formatDuration(list.estimatedProductionMinutes || prodMinutes)} (~{formatDays(productionDays)})
                      </span>
                      {estDates && !isComplete && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 font-black flex items-center gap-1 border border-violet-500/20">
                          <CalendarClock size={10} />
                          Dispatch: {formatDate(estDates.dispatchDate)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {list.items?.filter((item: any) => item.quantity > 0).map((item: any, idx: number) => {
                      const progress = item.quantity > 0 ? Math.min(100, Math.round((item.producedQuantity / item.quantity) * 100)) : 0;
                      return (
                        <div key={idx} className="bg-slate-800/30 rounded-xl p-3 border border-slate-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white font-bold text-xs">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</p>
                            <p className={`text-xs font-black ${progress >= 100 ? "text-emerald-400" : "text-amber-400"}`}>
                              {item.producedQuantity} / {item.quantity}
                            </p>
                          </div>
                          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
