"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { ListChecks, Plus, X, Trash2, Check, AlertTriangle, Package, Star, CheckCircle, ChevronDown, ChevronUp, CalendarClock, Clock } from "lucide-react";
import { calcListProductionMinutes, calcEstimatedDates, formatDate, formatDuration, formatDays, type PressSettings } from "@/lib/productionEstimate";

function ProductionListContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [products, setProducts] = useState<any[]>([]);
  const [prodLists, setProdLists] = useState<any[]>([]);
  const [pressSettings, setPressSettings] = useState<PressSettings>({ workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 });
  const [productTimings, setProductTimings] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(!!orderId);
  const [showItems, setShowItems] = useState(false);
  const [notes, setNotes] = useState("");
  const [listPriority, setListPriority] = useState(3);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);

  // Item builder
  const [step, setStep] = useState(0);
  const [selCat, setSelCat] = useState<any>(null);
  const [selThick, setSelThick] = useState<any>(null);
  const [selSize, setSelSize] = useState<any>(null);
  const [selQty, setSelQty] = useState("50");
  const [selLayers, setSelLayers] = useState<number | null>(null);
  const [selBrand, setSelBrand] = useState(false);
  const [selVarnish, setSelVarnish] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchAllData = async () => {
      try {
        const [listsRes, prodsRes] = await Promise.all([
          fetch("/api/production-lists").then((r) => r.json()),
          fetch("/api/company-products").then((r) => r.json()),
        ]);

        if (Array.isArray(prodsRes)) setProducts(prodsRes.filter((x: any) => x.isActive));
        // Handle new { lists, pressSettings, productTimings } shape
        if (listsRes && Array.isArray(listsRes.lists)) {
          setProdLists(listsRes.lists);
          if (listsRes.pressSettings) setPressSettings(listsRes.pressSettings);
          if (listsRes.productTimings) setProductTimings(listsRes.productTimings);
        } else if (Array.isArray(listsRes)) {
          setProdLists(listsRes);
        }

        if (orderId) {
          const smartRes = await fetch(`/api/production-lists/smart-target?orderId=${orderId}`).then((r) => r.json());
          if (smartRes.orderNumber) {
            setOrder(smartRes);
            const prefilled = smartRes.items.map((i: any) => ({
              categoryId: i.categoryId,
              categoryName: i.categoryName,
              thicknessId: i.thicknessId,
              thicknessValue: i.thicknessValue,
              sizeId: i.sizeId,
              sizeLabel: i.sizeLabel,
              orderedQuantity: i.orderedQuantity,
              stockAvailable: i.currentStock,
              allocatedElsewhere: i.allocatedElsewhere,
              effectiveStock: i.effectiveStock,
              alreadyPlanned: i.alreadyPlanned,
              quantity: String(i.targetQuantity),
              layers: i.layers,
              brandSeal: i.brandSeal,
              varnish: i.varnish,
            }));
            setItems(prefilled);
          }
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [status, orderId]);

  const displayLists = useMemo(() => {
    return prodLists.filter(l => {
      const isFinal = l.status === "COMPLETED" && (l.order ? ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(l.order.status) : true);
      return viewMode === "ACTIVE" ? !isFinal : isFinal;
    }).sort((a, b) => {
       if (a.priority !== b.priority) return a.priority - b.priority;
       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [prodLists, viewMode]);

  // Derived properties from products (catalog-based)
  const categories = [...new Map(products.map((p) => [p.category?.name, p.category])).values()].filter(Boolean);
  const getThicknesses = (catName: string) => {
    const filtered = products.filter((p) => p.category?.name === catName);
    return [...new Map(filtered.map((p) => [p.thickness?.value, p.thickness])).values()].filter(Boolean);
  };
  const getSizes = (catName: string, thickVal: number) => {
    return products.filter((p) => p.category?.name === catName && p.thickness?.value === thickVal).map(p => p.size).filter(Boolean);
  };

  const resetItem = () => {
    setStep(0); setSelCat(null); setSelThick(null); setSelSize(null); setSelQty("50"); setSelLayers(null); setSelBrand(false); setSelVarnish(false); setShowItems(false);
  };

  const addItem = () => {
    if (!selCat || !selThick || !selSize || !selQty) return;
    setItems([
      ...items,
      {
        categoryId: selCat.id,
        categoryName: selCat.name,
        thicknessId: selThick.id,
        thicknessValue: selThick.value,
        sizeId: selSize.id,
        sizeLabel: selSize.label,
        quantity: selQty,
        layers: selLayers,
        brandSeal: selBrand,
        varnish: selVarnish,
      },
    ]);
    resetItem();
  };

  const removeItem = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    setItems(newItems);
  };

  const submitList = async () => {
    if (items.length === 0) return;
    setError("");
    try {
      const res = await fetch("/api/production-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, notes, priority: listPriority, orderId: orderId || null }),
      });
      if (res.ok) {
        setSuccess("Production list created and operators notified!");
        setShowCreate(false);
        setItems([]);
        const p = await fetch("/api/production-lists").then((r) => r.json());
        if (p && Array.isArray(p.lists)) { setProdLists(p.lists); if (p.pressSettings) setPressSettings(p.pressSettings); } else if (Array.isArray(p)) setProdLists(p);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create list");
      }
    } catch { setError("Network error"); }
  };

  const updateListPriority = async (id: string, newPriority: number) => {
    await fetch(`/api/production-lists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    const p = await fetch("/api/production-lists").then((r) => r.json());
    if (p && Array.isArray(p.lists)) { setProdLists(p.lists); if (p.pressSettings) setPressSettings(p.pressSettings); } else if (Array.isArray(p)) setProdLists(p);
  };



  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>;
  }

  const statusColors: Record<string, string> = {
    PLANNED: "bg-slate-500/20 text-slate-300",
    PEELING: "bg-amber-500/20 text-amber-300",
    DRYING: "bg-blue-500/20 text-blue-300",
    PRESSING: "bg-violet-500/20 text-violet-300",
    FINISHING: "bg-emerald-500/20 text-emerald-300",
    COMPLETED: "bg-emerald-500/20 text-emerald-300",
  };

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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                <ListChecks size={28} className="text-amber-500" /> Production Lists
              </h1>
              <p className="text-slate-400 text-sm mt-1">Operational management of press-lines.</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-1 flex shadow-inner">
              <button 
                onClick={() => setViewMode("ACTIVE")} 
                className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${viewMode === "ACTIVE" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                ACTIVE
              </button>
              <button 
                onClick={() => setViewMode("HISTORY")} 
                className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${viewMode === "HISTORY" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                HISTORY
              </button>
            </div>
          </div>
          
          {!showCreate && (
            <button onClick={() => (setShowCreate(true), setShowItems(true))}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg hover:shadow-orange-900/20 active:scale-[0.97] transition-all">
              <Plus size={20} /> NEW LIST
            </button>
          )}
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="text-sm text-emerald-300 font-black">{success}</p>
          </div>
        )}

        {/* CREATE FORM */}
        {showCreate && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-black text-xl">Create New List</h2>
              <button onClick={() => { setShowCreate(false); setItems([]); resetItem(); }}
                className="p-2 text-slate-500 hover:text-white rounded-xl hover:bg-slate-800 transition">
                <X size={20} />
              </button>
            </div>

            {order && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                <p className="text-blue-300 text-sm font-black flex items-center gap-2 mb-1">
                   <Package size={16} /> ORDER: {order.orderNumber}
                </p>
                <p className="text-blue-400/60 text-xs font-bold leading-relaxed">Smart target quantities computed. Current stock, existing planning, and customer demand are all factored in automatically.</p>
              </div>
            )}

            {/* Item Table */}
            {/* Added Items (with Stock/Ordered details) */}
            {items.length > 0 && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ">Selected Items</h3>
                  {/* Real-time Draft Estimation */}
                  {(() => {
                    const mins = calcListProductionMinutes(items, productTimings, pressSettings);
                    if (mins <= 0) return null;
                    const productionDays = mins / (pressSettings.workingHoursPerDay * 60);
                    const totalDays = productionDays + 1; // +1 day finishing
                    const dispatchDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 animate-pulse">
                          Production: {formatDuration(mins)} (~{formatDays(productionDays)})
                        </span>
                        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                          Final Dispatch: {formatDate(dispatchDate)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid gap-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700/50 px-4 py-3 rounded-xl flex items-center justify-between group">
                      <div className="min-w-0">
                        <p className="text-white font-black text-sm">{item.categoryName} • {item.thicknessValue}mm • {item.sizeLabel}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.orderedQuantity !== undefined && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                              Ordered: {item.orderedQuantity}
                            </span>
                          )}
                          {item.stockAvailable !== undefined && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                              Stock: {item.stockAvailable}
                            </span>
                          )}
                          {item.layers && <span className="text-[10px] font-black px-2 py-0.5 bg-slate-700 rounded uppercase">{item.layers}L</span>}
                          {item.brandSeal && <span className="text-[10px] font-black text-emerald-400 uppercase">✓ Seal</span>}
                          {item.varnish && <span className="text-[10px] font-black text-amber-400 uppercase">✓ Varnish</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right w-24">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-1">To Produce</p>
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].quantity = e.target.value;
                              setItems(newItems);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-lg w-full px-2 py-1 text-amber-400 font-black text-lg text-right outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showItems ? (
              <button 
                onClick={() => setShowItems(true)}
                className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 font-black flex items-center justify-center gap-2 hover:border-slate-500 hover:text-slate-300 transition-all mb-6"
              >
                <Plus size={20} /> Add Product to List
              </button>
            ) : (
              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 mb-6 animate-in zoom-in-95">
                {/* Simplified Item Builder logic (re-implementing the standard step-based flow) */}
                <div className="space-y-6">
                   {step === 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase mb-3">➊ Select Category</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                           {categories.map(c => (
                             <button key={c.id} onClick={() => { setSelCat(c); setStep(1); }} className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition active:scale-95">{c.name}</button>
                           ))}
                        </div>
                      </div>
                   )}
                   
                   {step === 1 && selCat && (
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase mb-3">➋ Select Thickness <span className="text-slate-400">(for {selCat.name})</span></p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                           {getThicknesses(selCat.name).map(t => (
                             <button key={t.id} onClick={() => { setSelThick(t); setStep(2); }} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition active:scale-95">{t.value}mm</button>
                           ))}
                        </div>
                        <button onClick={() => setStep(0)} className="mt-4 text-slate-500 text-xs font-bold hover:text-white transition">← Back</button>
                      </div>
                   )}

                   {step === 2 && selCat && selThick && (
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase mb-3">➌ Select Size <span className="text-slate-400">(for {selCat.name} {selThick.value}mm)</span></p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                           {getSizes(selCat.name, selThick.value).map(s => (
                             <button key={s.id} onClick={() => { setSelSize(s); setStep(3); }} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition active:scale-95 text-xs">{s.label}</button>
                           ))}
                        </div>
                        <button onClick={() => setStep(1)} className="mt-4 text-slate-500 text-xs font-bold hover:text-white transition">← Back</button>
                      </div>
                   )}

                   {step === 3 && selCat && selThick && selSize && (
                      <div className="space-y-4">
                        <p className="text-xs font-black text-slate-500 uppercase">➍ Quantity & Options</p>
                        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl">
                           <p className="text-white font-black text-lg">{selCat.name} • {selThick.value}mm • {selSize.label}</p>
                           
                           <div className="mt-4">
                              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Quantity (Sheets)</label>
                              <input type="number" value={selQty} onChange={e => setSelQty(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-black text-2xl" />
                           </div>

                           <div className="grid grid-cols-2 gap-2 mt-4">
                              <button onClick={() => setSelBrand(!selBrand)} className={`py-4 rounded-xl font-black text-xs transition ${selBrand ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}`}>BRAND SEAL</button>
                              <button onClick={() => setSelVarnish(!selVarnish)} className={`py-4 rounded-xl font-black text-xs transition ${selVarnish ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400"}`}>VARNISH</button>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                           <button onClick={addItem} className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-sm">Add to Production List</button>
                           <button onClick={() => setStep(2)} className="px-6 py-4 bg-slate-800 text-slate-400 rounded-xl font-black">←</button>
                        </div>
                      </div>
                   )}
                </div>
                <button onClick={resetItem} className="mt-6 text-slate-500 text-[10px] font-black uppercase tracking-widest w-full text-center hover:text-white transition">Dismiss Builder</button>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 mb-6">
               <div className="flex-1">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Priority</h4>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(p => (
                    <button key={p} onClick={() => setListPriority(p)} className={`flex-1 py-3 rounded-xl font-black text-sm transition ${listPriority === p ? "bg-amber-600 text-white shadow-lg shadow-amber-900/20" : "bg-slate-800 text-slate-500"}`}>P{p}</button>
                  ))}
                </div>
               </div>
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational notes for the press operators..." rows={2}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-amber-500/50 mb-6" />

            {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6 flex items-center gap-3"><AlertTriangle size={18} className="text-red-400" /><p className="text-xs text-red-300 font-bold">{error}</p></div>}

            <button onClick={submitList} disabled={items.length === 0}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-orange-900/40 disabled:opacity-30 active:scale-[0.98] transition-all">
              EXECUTE PRODUCTION LIST ({items.length} ITEMS)
            </button>
          </div>
        )}

        {/* LIST RENDERER */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" /></div>
        ) : (
          <div className="space-y-4">
            {displayLists.length === 0 && !showCreate ? (
              <div className="text-center py-24 bg-slate-900/20 rounded-3xl border border-slate-800">
                <Package size={64} className="mx-auto text-slate-800 mb-4" />
                <p className="text-slate-500 text-lg font-black uppercase tracking-widest">No {viewMode} Production Lists</p>
                <p className="text-slate-600 text-sm mt-2 font-bold px-4">All {viewMode === "ACTIVE" ? "operational" : "completed"} lists will be shown here.</p>
              </div>
            ) : (
              displayLists.map((list) => {
                const pc = priorityConfig[list.priority] || priorityConfig[3];
                const isComplete = list.status === "COMPLETED";

                // Estimation for this list
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
                const estDates = hasTimings && list.order?.createdAt
                  ? calcEstimatedDates(list.order.createdAt, prodMinutes, pressSettings)
                  : null;

                return (
                  <div key={list.id} className={`bg-slate-900 shadow-xl border rounded-3xl overflow-hidden transition-all hover:bg-slate-900/80 ${
                    isComplete ? "border-emerald-500/20" : "border-slate-800"
                  }`}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex flex-col">
                            <h3 className="text-white font-black text-xl tracking-tight">
                              {list.order?.customer?.name || "Stock Production"}
                            </h3>
                            <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase">
                              {list.listNumber}
                            </span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                             <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${pc.bg} ${pc.color}`}>{pc.label}</span>
                             <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${statusColors[list.status]}`}>{list.status}</span>
                             {/* Use stored estimation if available, fallback to frontend calc */}
                             {(list.estimatedProductionMinutes || hasTimings) && (
                               <span className="text-[10px] px-3 py-1 rounded-full bg-orange-600 text-white font-black flex items-center gap-1 shadow-lg shadow-orange-900/40 border border-orange-400/30">
                                 <Clock size={10} className="fill-current" />
                                 PRODUCTION TIME: {formatDuration(list.estimatedProductionMinutes || prodMinutes)}
                               </span>
                             )}
                             {(list.estimatedProductionMinutes || prodMinutes) > 0 && (
                               <span className="text-[10px] px-3 py-1 rounded-full bg-orange-500/15 text-orange-300 font-bold border border-orange-500/20">
                                 ~{formatDays((list.estimatedProductionMinutes || prodMinutes) / (pressSettings.workingHoursPerDay * 60))}
                               </span>
                             )}
                             {estDates && !isComplete && (
                               <span className="text-[10px] px-3 py-1 rounded-full bg-violet-600 text-white font-black flex items-center gap-1 shadow-lg shadow-violet-900/40 border border-violet-400/30 animate-pulse">
                                 <CalendarClock size={10} className="fill-current" />
                                 DISPATCH: {formatDate(estDates.dispatchDate)}
                               </span>
                             )}
                          </div>
                        </div>
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
                           {new Date(list.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Production Targets</h4>
                          {list.items?.map((item: any, idx: number) => {
                            const progress = item.quantity > 0 ? Math.min(100, Math.round((item.producedQuantity / item.quantity) * 100)) : 0;
                            return (
                              <div key={idx} className="bg-slate-800/40 rounded-2xl p-5 border border-slate-800/50">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="min-w-0">
                                    <p className="text-white font-black text-sm">{item.category?.name}</p>
                                    <p className="text-slate-500 text-xs font-bold uppercase">{item.thickness?.value}mm • {item.size?.label}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className={`text-xl font-black ${progress >= 100 ? "text-emerald-400" : "text-amber-400"}`}>
                                        {item.producedQuantity}<span className="text-slate-600 text-sm font-bold"> / {item.quantity}</span>
                                     </p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                                  <div className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-amber-500"}`}
                                    style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                  <span className="text-[10px] font-black text-slate-500 uppercase">{progress}% COMPLETE</span>
                                  {item.layers && <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-slate-400 rounded uppercase">{item.layers} Layers</span>}
                                  {item.brandSeal && <span className="text-[10px] font-black text-emerald-500/80 uppercase">✓ SEAL</span>}
                                  {item.varnish && <span className="text-[10px] font-black text-amber-500/80 uppercase">✓ VARNISH</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-6">
                           <div>
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Operational Details</h4>
                              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-800/50 space-y-4">
                                  <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Reference Order</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-widest font-black text-[10px]">
                                        {list.order?.customer?.name || "STOCK"}
                                      </span>
                                      <p className="text-white font-black">{list.order?.orderNumber || "No Order"}</p>
                                    </div>
                                  </div>
                                <div>
                                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Created By</p>
                                  <p className="text-slate-300 font-bold flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      SUPERVISOR
                                    </span>
                                    {list.createdBy?.name}
                                  </p>
                                </div>
                                {list.notes && (
                                  <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Notes</p>
                                    <p className="text-slate-400 text-xs italic leading-relaxed">{list.notes}</p>
                                  </div>
                                )}
                              </div>
                           </div>

                           {!isComplete && (
                             <div className="space-y-3">
                               <div className="flex items-center justify-between px-2">
                                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Adjust Priority</h4>
                                 <button onClick={() => setEditingPriorityId(editingPriorityId === list.id ? null : list.id)}
                                   className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded transition hover:bg-slate-700 font-bold uppercase tracking-widest">
                                   {editingPriorityId === list.id ? "DONE" : "EDIT PRIORITY"}
                                 </button>
                               </div>
                               {editingPriorityId === list.id ? (
                                 <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(p => (
                                      <button key={p} onClick={async () => { await updateListPriority(list.id, p); setEditingPriorityId(null); }} 
                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition active:scale-[0.95] ${list.priority === p ? "bg-amber-600 text-white shadow-lg" : "bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700"}`}>P{p}</button>
                                    ))}
                                 </div>
                               ) : (
                                 <div className="px-2">
                                    <div className={`inline-block py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest ${pc.bg} ${pc.color}`}>
                                      PRIORITY {list.priority}
                                    </div>
                                 </div>
                               )}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SupervisorProductionList() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>}>
      <ProductionListContent />
    </Suspense>
  );
}
