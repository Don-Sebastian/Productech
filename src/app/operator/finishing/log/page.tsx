"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import {
  Plus, Trash2, Package, Loader2, CheckSquare,
  ChevronDown, ChevronUp, Layers, BoxSelect
} from "lucide-react";

function fmt(d: string | null | undefined): string {
  if (!d) return "--:--";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

export default function FinishingDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add entry
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<0 | 1 | 2>(0);
  const [selCat, setSelCat] = useState<any>(null);
  const [selThick, setSelThick] = useState<any>(null);
  const [selSize, setSelSize] = useState<any>(null);
  const [qty, setQty] = useState("0");
  const [entryNotes, setEntryNotes] = useState("");
  const [showProdLists, setShowProdLists] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/finishing");
      if (res.ok) setData(await res.json());
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (status === "authenticated" && assigned) fetchData(); }, [fetchData, status, assigned]);

  const doAction = async (action: string, extra: Record<string, any> = {}) => {
    try {
      const res = await fetch("/api/finishing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) await fetchData();
      else { const err = await res.json(); alert(err.error || "Action failed"); }
    } catch { alert("Network error"); }
  };

  if (status === "loading" || assignmentLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }
  if (!assigned) return <MachineRequiredScreen error={assignmentError} />;
  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar user={session.user} />
        <main className="ml-0 md:ml-64 p-3 md:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <BoxSelect className="animate-pulse text-violet-500" size={40} />
          </div>
        </main>
      </div>
    );
  }

  const todayLog = data?.todayLog;
  const entries = todayLog?.entries || [];
  const products = data?.products || [];
  const prodLists = data?.productionLists || [];

  const totalFinished = entries.reduce((s: number, e: any) => s + e.quantity, 0);

  // Build product hierarchy
  const categories = [...new Map(products.map((p: any) => [p.category.id, p.category])).values()].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const getThicknesses = () => {
    const ts = products.filter((p: any) => p.category.id === selCat?.id).map((p: any) => p.thickness);
    return [...new Map(ts.map((t: any) => [t.id, t])).values()].sort((a: any, b: any) => b.value - a.value);
  };
  const getSizes = () => {
    const ss = products.filter((p: any) => p.category.id === selCat?.id && p.thickness.id === selThick?.id).map((p: any) => p.size);
    return [...new Map(ss.map((s: any) => [s.id, s])).values()];
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                <CheckSquare className="text-violet-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Finishing</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Daily Production Log • {new Date().toLocaleDateString("en-IN")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-violet-400">{totalFinished}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase">SHEETS TODAY</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-white">{entries.length}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase">Entries</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-violet-400">{totalFinished}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase">Ready for Shipment</p>
            </div>
          </div>

          {/* Add Entry */}
          <button
            onClick={() => { setShowAdd(true); setAddStep(0); setSelCat(null); setSelThick(null); setSelSize(null); setQty("0"); setEntryNotes(""); }}
            className="w-full py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-lg font-black rounded-2xl shadow-xl shadow-violet-900/20 flex items-center justify-center gap-3 active:scale-[0.98] transition"
          >
            <Plus size={24} /> LOG FINISHED PLYWOOD
          </button>

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
                    <p key={item.id} className="text-white text-[10px]">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label} — {item.producedQuantity}/{item.quantity}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Entries Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} /> Today's Entries
              </h2>
              <span className="text-slate-500 text-[10px] font-black">{entries.length} ENTRIES</span>
            </div>
            <div className="p-3 space-y-2 max-h-[450px] overflow-y-auto">
              {entries.length === 0 ? (
                <p className="text-slate-600 text-center py-8 text-sm">No entries today. Log your first finished plywood batch.</p>
              ) : (
                entries.map((e: any) => (
                  <div key={e.id} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <CheckSquare size={16} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-xs">
                          {e.category?.name} • {e.thickness?.value}mm • {e.size?.label}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold">
                          {e.quantity} sheets • {fmt(e.timestamp)}
                          {e.notes && <span className="ml-2 text-slate-600">— {e.notes}</span>}
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
                  <CheckSquare size={18} className="text-violet-500" />
                  {addStep === 0 ? "Select Category" : addStep === 1 ? "Select Thickness" : "Quantity"}
                </h3>
                <button onClick={() => setShowAdd(false)} className="p-2 text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {addStep === 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((c: any) => (
                      <button key={c.id} onClick={() => { setSelCat(c); setAddStep(1); }}
                        className="p-5 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-violet-600 transition active:scale-95">
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {addStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">Category: <span className="text-white font-bold">{selCat?.name}</span></p>
                    <div className="grid grid-cols-3 gap-2">
                      {getThicknesses().map((t: any) => (
                        <button key={t.id} onClick={() => { setSelThick(t); setAddStep(2); }}
                          className="p-4 bg-slate-800 text-white rounded-2xl font-black text-lg hover:bg-violet-600 transition active:scale-95">
                          {t.value}<span className="text-xs opacity-60">mm</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setAddStep(0)} className="text-sm text-slate-400">← Back</button>
                  </div>
                )}
                {addStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">{selCat?.name} • <span className="text-white font-bold">{selThick?.value}mm</span></p>

                    {!selSize ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Size</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getSizes().map((s: any) => (
                            <button key={s.id} onClick={() => setSelSize(s)}
                              className="p-4 bg-slate-800 text-white rounded-2xl font-black hover:bg-violet-600 transition active:scale-95">
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => { setAddStep(1); setSelThick(null); }} className="text-sm text-slate-400">← Back</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-violet-500/10 border border-violet-500/20 p-4 rounded-2xl">
                          <p className="text-white font-black">{selCat.name} • {selThick.value}mm • {selSize.label}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Quantity (sheets)</label>
                          <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1}
                            className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-black text-center text-2xl" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Notes (optional)</label>
                          <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white" placeholder="Any notes..." />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={async () => {
                            await doAction("addEntry", { categoryId: selCat.id, thicknessId: selThick.id, sizeId: selSize.id, quantity: qty, notes: entryNotes });
                            setShowAdd(false);
                          }}
                            className="flex-1 py-4 bg-violet-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition">
                            SAVE ENTRY
                          </button>
                          <button onClick={() => setSelSize(null)} className="px-6 bg-slate-800 text-slate-400 font-bold rounded-2xl">BACK</button>
                        </div>
                      </div>
                    )}
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
