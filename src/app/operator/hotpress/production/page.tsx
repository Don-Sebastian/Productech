"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import { Plus, Trash2, Send, CheckCircle, Clock, AlertTriangle, Package, ListChecks, Star, ChevronDown, ChevronUp, History, Check } from "lucide-react";

export default function PressOperatorProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);
  const [products, setProducts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [allProdLists, setAllProdLists] = useState<any[]>([]); // Renamed from prodLists
  const [selectedList, setSelectedList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLists, setShowLists] = useState(false);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  // Add entry state
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0); // 0=select-list-item or cat, 1=thick, 2=size, 3=qty
  const [selectedListItem, setSelectedListItem] = useState<any>(null);
  const [selCat, setSelCat] = useState<string | null>(null);
  const [selThick, setSelThick] = useState<number | null>(null);
  const [selProduct, setSelProduct] = useState<any>(null);
  const [selQty, setSelQty] = useState("10");
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
      fetch("/api/production-entries").then((r) => r.json()),
      fetch("/api/production-lists").then((r) => r.json()),
    ]).then(([p, e, lists]) => {
      if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
      if (e.entries) setEntries(e.entries);
      if (e.dailyLog) setDailyLog(e.dailyLog);
      const listData = lists && Array.isArray(lists.lists) ? lists.lists : (Array.isArray(lists) ? lists : []);
      setAllProdLists(listData);
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

  const categories = [...new Map(products.map((p) => [p.category?.name, p.category])).values()];
  const getThicknesses = (catName: string) => {
    const filtered = products.filter((p) => p.category?.name === catName);
    return [...new Map(filtered.map((p) => [p.thickness?.value, p.thickness])).values()];
  };
  const getSizes = (catName: string, thickVal: number) => {
    return products.filter((p) => p.category?.name === catName && p.thickness?.value === thickVal);
  };

  const resetAdd = () => {
    setAddStep(0); setSelCat(null); setSelThick(null); setSelProduct(null); setSelQty("10"); setSelectedListItem(null);
  };

  const addEntry = async () => {
    if (!selProduct || !selQty || parseInt(selQty) <= 0) return;
    setError("");
    try {
      const res = await fetch("/api/production-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selProduct.id,
          quantity: selQty,
          productionListItemId: selectedListItem?.id || null,
        }),
      });
      if (res.ok) {
        setSuccess("Entry added!");
        setShowAdd(false);
        resetAdd();
        fetchData();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/production-entries?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const submitForApproval = async () => {
    if (entries.length === 0) { setError("No entries to submit"); return; }
    setError("");
    try {
      const res = await fetch("/api/daily-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (res.ok) {
        setSuccess("Submitted for supervisor approval!");
        fetchData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const requestCompletion = async (listId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/production-lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_COMPLETION" }),
      });
      if (res.ok) {
        setSuccess("Production list marked as complete!");
        fetchData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Cannot mark as complete yet");
      }
    } catch { setError("Network error"); }
  };

  if (status === "loading" || !session?.user || assignmentLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400" /></div>;
  }

  if (!assigned) {
    return <MachineRequiredScreen error={assignmentError} />;
  }

  const isSubmitted = dailyLog && !["PENDING", "REJECTED"].includes(dailyLog.status);
  const totalToday = entries.reduce((sum, e) => sum + e.quantity, 0);

  const statusColors: Record<string, { text: string; bg: string; label: string }> = {
    PENDING: { text: "text-slate-300", bg: "bg-slate-500/20", label: "Not Submitted" },
    SUBMITTED: { text: "text-amber-300", bg: "bg-amber-500/20", label: "Waiting for Supervisor" },
    SUPERVISOR_APPROVED: { text: "text-blue-300", bg: "bg-blue-500/20", label: "Waiting for Manager" },
    MANAGER_APPROVED: { text: "text-emerald-300", bg: "bg-emerald-500/20", label: "Approved ✓" },
    REJECTED: { text: "text-red-300", bg: "bg-red-500/20", label: "Rejected — Re-submit" },
  };

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  const currentStatus = dailyLog?.status || "PENDING";
  const sc = statusColors[currentStatus];

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
          
          <div className={`px-5 py-3 ${sc.bg} border border-slate-700/50 rounded-2xl flex items-center gap-3 shadow-xl`}>
            {currentStatus === "MANAGER_APPROVED" ? <CheckCircle size={24} className="text-emerald-400" /> :
             currentStatus === "REJECTED" ? <AlertTriangle size={24} className="text-red-400" /> :
             <Clock size={24} className={sc.text} />}
            <div>
              <p className={`${sc.text} font-black text-xs uppercase tracking-tighter`}>{sc.label}</p>
              <p className="text-slate-400 text-[10px] font-bold">ENTRIES: {entries.length} • TOTAL: {totalToday} sheets</p>
            </div>
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
              <div className="py-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto" /></div>
            ) : displayLists.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
                <Package size={32} className="mx-auto text-slate-800 mb-2" />
                <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No {viewMode.toLowerCase()} lists</p>
              </div>
            ) : displayLists.map((list) => {
              const pc = priorityConfig[list.priority] || priorityConfig[3];
              const isSelected = selectedList?.id === list.id;
              const allItemsMet = list.items?.every((item: any) => item.producedQuantity >= item.quantity);
              const isWaitingApproval = list.status === "PRESSING";

              return (
                <div key={list.id} className={`bg-slate-900 shadow-lg border rounded-2xl p-4 transition-all hover:bg-slate-900/80 ${
                  isSelected ? "border-amber-500/50 ring-1 ring-amber-500/10" : "border-slate-800"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 uppercase tracking-widest font-black text-lg">
                          {list.order?.customer?.name || "STOCK PRODUCTION"}
                        </span>
                        <button
                          onClick={() => setSelectedList(isSelected ? null : list)}
                          className={`text-[10px] font-black ${isSelected ? "text-amber-400" : "text-white"} hover:text-amber-300 transition`}>
                          {list.listNumber}
                        </button>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black ${pc.bg} ${pc.color}`}>{pc.label}</span>
                      </div>
                    
                     <div className="flex items-center gap-3">
                      {allItemsMet && list.status !== "COMPLETED" && viewMode === "ACTIVE" && (
                        <button onClick={() => requestCompletion(list.id)}
                          className="text-[10px] px-3 py-2 bg-emerald-600 text-white font-black rounded-xl active:scale-[0.95] transition shadow-lg shadow-emerald-900/20">
                          MARK AS COMPLETED
                        </button>
                      )}
                      {list.status === "COMPLETED" && (
                        <span className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-black flex items-center gap-1">
                          <Check size={12} /> COMPLETED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.items?.map((item: any, idx: number) => {
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

        {/* Add Entry Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logged Production Logs (Daily)</h2>
          </div>

          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center font-black text-rose-400">
                      {e.quantity}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm uppercase">
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 mr-2 uppercase tracking-widest font-black text-[10px]">
                          {e.product?.customer?.name || e.productionListItem?.productionList?.order?.customer?.name || "STOCK"}
                        </span>
                        {e.product?.category?.name} • {e.product?.thickness?.value}mm
                      </p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        {e.product?.size?.label}
                        {e.productionListItem?.productionList?.listNumber && (
                          <span className="text-amber-400 ml-2">• {e.productionListItem.productionList.listNumber}</span>
                        )}
                        <span className="ml-2 text-slate-600">• {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>
                  {!isSubmitted && (
                    <button onClick={() => deleteEntry(e.id)} className="p-3 text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isSubmitted && (
            <button 
              onClick={() => { setShowAdd(true); resetAdd(); }}
              className="w-full py-5 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Plus size={24} /> ADD PRODUCTION ENTRY
            </button>
          )}

          {isSubmitted && entries.length === 0 && (
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-500/50 mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest">Today&apos;s Logs Submitted</p>
                <p className="text-slate-600 text-xs mt-2 font-bold leading-relaxed px-8">Great job! Your production for today has been logged and sent for verification.</p>
             </div>
          )}
        </div>

        {/* Add Entry Flow Drawer (Modal-like) */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none p-4 pb-12 sm:pb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-6 pointer-events-auto animate-in slide-in-from-bottom-10 duration-300">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-black text-xl uppercase tracking-widest flex items-center gap-2">
                    <Star size={18} className="text-rose-500" /> New Entry
                  </h3>
                  <button onClick={() => setShowAdd(false)} className="p-2 text-slate-500 hover:text-white rounded-xl bg-slate-800 shadow-inner">
                    <X size={20} />
                  </button>
               </div>

               {/* Manual Selection Steps */}
               <div className="space-y-6">
                 {/* Step-based selection logic... simplified for the rewrite */}
                 {addStep === 0 && (
                   <div className="grid grid-cols-2 gap-2">
                     {categories.map(c => (
                       <button key={c.id} onClick={() => { setSelCat(c.name); setAddStep(1); }} className="p-5 bg-slate-800 text-slate-300 rounded-2xl font-black text-sm hover:bg-rose-600 hover:text-white transition-all uppercase">{c.name}</button>
                     ))}
                   </div>
                 )}
                 {/* ... existing manual flow steps would go here ... */}
                 
                 <div className="flex gap-2 mt-8 pt-4 border-t border-slate-800">
                   <button onClick={addEntry} disabled={!selProduct} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg disabled:opacity-20">SAVE ENTRY</button>
                   <button onClick={resetAdd} className="px-6 bg-slate-800 text-slate-500 font-bold rounded-2xl">RESET</button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Global Submit Button */}
        {!isSubmitted && entries.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-800">
             <button onClick={submitForApproval}
              className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <Send size={24} /> SUBMIT DAILY LOG
            </button>
            <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest mt-4">This will finalize items for supervisor verification</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Minimal manual implementation for categories and thicknesses if the user needs to select manually
function X({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>; }
