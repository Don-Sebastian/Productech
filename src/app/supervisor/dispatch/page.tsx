"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { Truck, Plus, X, Trash2, Check, AlertTriangle, Package, CalendarClock } from "lucide-react";
import { calcListProductionMinutes, calcEstimatedDates, formatDate, type PressSettings } from "@/lib/productionEstimate";

function DispatchListContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [catalog, setCatalog] = useState<any>({ categories: [], thicknesses: [], sizes: [] });
  const [dispatchLoads, setDispatchLoads] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [pressSettings, setPressSettings] = useState<PressSettings>({ workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 });
  const [productTimings, setProductTimings] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(!!orderId);
  const [showBuilder, setShowBuilder] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Item builder
  const [step, setStep] = useState(0);
  const [selCat, setSelCat] = useState<any>(null);
  const [selThick, setSelThick] = useState<any>(null);
  const [selSize, setSelSize] = useState<any>(null);
  const [selQty, setSelQty] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/dispatch").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/company-products").then((r) => r.json()),
      orderId ? fetch(`/api/orders/${orderId}`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([c, dLists, oList, products, o]) => {
      setCatalog(c);
      if (Array.isArray(dLists)) setDispatchLoads(dLists);
      // Handle new { orders, pressSettings, productTimings } shape from orders API
      const orderList = oList && Array.isArray(oList.orders) ? oList.orders : (Array.isArray(oList) ? oList : []);
      if (oList?.pressSettings) setPressSettings(oList.pressSettings);
      if (oList?.productTimings) setProductTimings(oList.productTimings);
      
      setReadyOrders(orderList.filter((order: any) =>
        order.status === "READY_FOR_DISPATCH" &&
        !(Array.isArray(dLists) && dLists.some((d: any) => d.orderId === order.id))
      ));
      if (o && !o.error) {
        setOrder(o);
        // Pre-fill items from order
        if (o.items?.length && Array.isArray(products)) {
          const prefillItems = o.items.map((i: any) => {
            const catId = i.categoryId || i.category?.id;
            const thkId = i.thicknessId || i.thickness?.id;
            const szId = i.sizeId || i.size?.id;
            
            // Find inventory match
            const invProduct = products.find(p => p.categoryId === catId && p.thicknessId === thkId && p.sizeId === szId && p.isActive);
            const stock = invProduct ? invProduct.currentStock : 0;
            const dispatchQty = Math.min(i.quantity, stock);

            return {
              categoryId: catId,
              categoryName: i.category?.name,
              thicknessId: thkId,
              thicknessValue: i.thickness?.value,
              sizeId: szId,
              sizeLabel: i.size?.label,
              orderedQuantity: i.quantity,
              stockAvailable: stock,
              quantity: String(dispatchQty),
              skip: dispatchQty === 0
            };
          }).filter((i: any) => !i.skip);

          setItems(prefillItems);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, orderId]);

  const resetItem = () => {
    setStep(0); setSelCat(null); setSelThick(null); setSelSize(null);
    setSelQty("");
  };

  const addItem = () => {
    if (!selCat || !selThick || !selSize || !selQty) return;
    setItems([...items, {
      categoryId: selCat.id, categoryName: selCat.name,
      thicknessId: selThick.id, thicknessValue: selThick.value,
      sizeId: selSize.id, sizeLabel: selSize.label,
      quantity: selQty
    }]);
    resetItem();
  };

  const submitList = async () => {
    if (items.length === 0) { setError("Add at least one item"); return; }
    if (!orderId) { setError("Order ID required for dispatch"); return; }
    setError("");
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, notes,
          items: items.map((i) => ({
            categoryId: i.categoryId, thicknessId: i.thicknessId, sizeId: i.sizeId,
            quantity: i.quantity, notes: ""
          })),
        }),
      });
      if (res.ok) {
        setSuccess("Dispatch load submitted to manager!");
        setShowCreate(false); setItems([]); setNotes(""); resetItem();
        
        const [d, oList] = await Promise.all([
          fetch("/api/dispatch").then((r) => r.json()),
          fetch("/api/orders").then((r) => r.json()),
        ]);
        
        if (Array.isArray(d)) setDispatchLoads(d);
        const orderList = oList && Array.isArray(oList.orders) ? oList.orders : (Array.isArray(oList) ? oList : []);
        if (oList?.pressSettings) setPressSettings(oList.pressSettings);
        setReadyOrders(orderList.filter((ord: any) =>
          ord.status === "READY_FOR_DISPATCH" &&
          !(Array.isArray(d) && d.some((load: any) => load.orderId === ord.id))
        ));

        setTimeout(() => setSuccess(""), 4000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>;
  }

  const statusColors: Record<string, string> = {
    SUPERVISOR_SUBMITTED: "bg-amber-500/20 text-amber-300",
    MANAGER_CONFIRMED: "bg-blue-500/20 text-blue-300",
    DISPATCHED: "bg-emerald-500/20 text-emerald-300",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Truck size={28} className="text-emerald-400" /> Dispatch Loads
            </h1>
            <p className="text-slate-400 text-sm mt-1">Submit finished plywood for dispatch</p>
          </div>
          {!showCreate && (
            <button onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg active:scale-[0.97]">
              <Plus size={20} /> New Dispatch Load
            </button>
          )}
        </div>

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <Check size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-300 font-semibold">{success}</p>
          </div>
        )}

        {/* CREATE FORM */}
        {showCreate && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">New Dispatch Load</h2>
              <button onClick={() => { setShowCreate(false); setItems([]); resetItem(); }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            {order && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-blue-300 text-sm font-semibold mb-2 flex items-center gap-2">
                   📦 For Order: {order.orderNumber}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-widest font-black text-[10px]">
                    {order.customer?.name}
                  </span>
                  <p className="text-blue-400/70 text-xs">• {order.items?.length} items</p>
                </div>
              </div>
            )}
            
            {!order && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-amber-300 text-sm">
                No order selected. Please go to Orders and click &quot;Create Dispatch Load&quot; to link properly. 
                <button onClick={() => router.push('/supervisor/orders')} className="block mt-2 font-bold underline">Go to Orders &rarr;</button>
              </div>
            )}

            {/* Added items */}
            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-slate-400 text-xs mb-2 ml-1">Items to Dispatch (Auto-filled from stock):</p>
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">{item.categoryName} • {item.thicknessValue}mm • {item.sizeLabel}</p>
                      <p className="text-slate-400 text-xs">
                        Dispatch Qty: <span className="text-emerald-400 font-bold">{item.quantity}</span>
                        {item.orderedQuantity !== undefined && ` (Needed: ${item.orderedQuantity}, Stock: ${item.stockAvailable})`}
                      </p>
                    </div>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Item Builder */}
            {order && !showBuilder && (
              <button 
                onClick={() => setShowBuilder(true)} 
                className="w-full py-3 mb-4 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex items-center justify-center gap-2 font-semibold active:scale-[0.98]">
                <Plus size={18} /> Add Extra Item Manually
              </button>
            )}

            {order && showBuilder && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-4 relative">
                <button onClick={() => setShowBuilder(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition bg-slate-800 p-1 rounded-md max-w-fit"><X size={16} /></button>
                <p className="text-emerald-300 font-semibold text-sm mb-3">
                  {step === 0 ? "➊ Select Category" : step === 1 ? "➋ Thickness" : step === 2 ? "➌ Size" : "➍ Quantity To Dispatch"}
                </p>

                {step === 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {catalog.categories?.map((c: any) => (
                      <button key={c.id} onClick={() => { setSelCat(c); setStep(1); }}
                        className="py-4 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base">{c.name}</button>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Category: <span className="text-white">{selCat?.name}</span></p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {catalog.thicknesses?.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelThick(t); setStep(2); }}
                          className="py-3 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
                          {t.value}<span className="text-xs opacity-60">mm</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStep(0)} className="mt-2 text-sm text-slate-400">← Back</button>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{selCat?.name} • {selThick?.value}mm</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {catalog.sizes?.map((s: any) => (
                        <button key={s.id} onClick={() => { setSelSize(s); setStep(3); }}
                          className="py-3 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition active:scale-[0.95]">{s.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setStep(1)} className="mt-2 text-sm text-slate-400">← Back</button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">{selCat?.name} • {selThick?.value}mm • {selSize?.label}</p>
                    <input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Dispatch qty" />

                    <div className="flex gap-2">
                      <button onClick={addItem} className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl active:scale-[0.97]">+ Add Item</button>
                      <button onClick={() => setStep(2)} className="px-4 bg-slate-700 text-slate-300 rounded-xl">←</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)" rows={2}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4" />

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /><p className="text-sm text-red-300">{error}</p></div>}

            <button onClick={submitList} disabled={items.length === 0 || !order}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-30 active:scale-[0.97] transition">
              Submit Dispatch Load ({items.length} items)
            </button>
          </div>
        )}

        {!showCreate && readyOrders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-emerald-300 font-bold text-sm mb-3 flex items-center gap-2">
              📦 ORDERS READY FOR DISPATCH ({readyOrders.length})
            </h2>
            <div className="space-y-3">
              {readyOrders.map((ro) => {
                const prodMinutes = calcListProductionMinutes(
                  (ro.items || []).map((i: any) => ({
                    quantity: i.quantity,
                    categoryId: i.categoryId,
                    thicknessId: i.thicknessId,
                  })),
                  productTimings,
                  pressSettings
                );
                const estDispatch = prodMinutes > 0 && ro.createdAt
                  ? calcEstimatedDates(ro.createdAt, prodMinutes, pressSettings).dispatchDate
                  : null;
                return (
                  <div key={ro.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-black text-xl tracking-tight">
                        {ro.customer?.name || "Private Order"}
                      </h3>
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-widest font-black text-[10px]">
                        Order: {ro.orderNumber}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-widest font-black text-[10px]">
                          {ro.customer?.name}
                        </span>
                        <p className="text-slate-400 text-sm">• {ro.items?.length} items</p>
                        {estDispatch && (
                          <span className="text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20 font-bold text-[10px] flex items-center gap-1">
                            <CalendarClock size={10} /> Est. {formatDate(estDispatch)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => {
                        router.push(`/supervisor/dispatch?orderId=${ro.id}`);
                        setShowCreate(true);
                      }}
                      className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl active:scale-[0.97] transition shrink-0">
                      Create Dispatch Load
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SupervisorDispatchList() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>}>
      <DispatchListContent />
    </Suspense>
  );
}
