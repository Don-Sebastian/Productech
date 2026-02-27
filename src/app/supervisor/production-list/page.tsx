"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { ListChecks, Plus, X, Trash2, Check, AlertTriangle, Package } from "lucide-react";

function ProductionListContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [catalog, setCatalog] = useState<any>({ categories: [], thicknesses: [], sizes: [] });
  const [prodLists, setProdLists] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(!!orderId);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/production-lists").then((r) => r.json()),
      orderId ? fetch(`/api/orders/${orderId}`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([c, p, o]) => {
      setCatalog(c);
      if (Array.isArray(p)) setProdLists(p);
      if (o && !o.error) {
        setOrder(o);
        // Pre-fill items from order
        if (o.items?.length) {
          setItems(o.items.map((i: any) => ({
            categoryId: i.categoryId || i.category?.id,
            categoryName: i.category?.name,
            thicknessId: i.thicknessId || i.thickness?.id,
            thicknessValue: i.thickness?.value,
            sizeId: i.sizeId || i.size?.id,
            sizeLabel: i.size?.label,
            quantity: String(i.quantity),
            layers: i.layers, brandSeal: i.brandSeal, varnish: i.varnish,
          })));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, orderId]);

  const resetItem = () => {
    setStep(0); setSelCat(null); setSelThick(null); setSelSize(null);
    setSelQty("50"); setSelLayers(null); setSelBrand(false); setSelVarnish(false);
  };

  const addItem = () => {
    if (!selCat || !selThick || !selSize || !selQty) return;
    setItems([...items, {
      categoryId: selCat.id, categoryName: selCat.name,
      thicknessId: selThick.id, thicknessValue: selThick.value,
      sizeId: selSize.id, sizeLabel: selSize.label,
      quantity: selQty, layers: selLayers, brandSeal: selBrand, varnish: selVarnish,
    }]);
    resetItem();
  };

  const submitList = async () => {
    if (items.length === 0) { setError("Add at least one item"); return; }
    setError("");
    try {
      const res = await fetch("/api/production-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId || undefined, notes,
          items: items.map((i) => ({
            categoryId: i.categoryId, thicknessId: i.thicknessId, sizeId: i.sizeId,
            quantity: i.quantity, layers: i.layers, brandSeal: i.brandSeal, varnish: i.varnish,
          })),
        }),
      });
      if (res.ok) {
        setSuccess("Production list created! Operators notified.");
        setShowCreate(false); setItems([]); setNotes(""); resetItem();
        const p = await fetch("/api/production-lists").then((r) => r.json());
        if (Array.isArray(p)) setProdLists(p);
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

  const qtyPresets = [25, 50, 100, 200, 300, 500];

  const statusColors: Record<string, string> = {
    PLANNED: "bg-slate-500/20 text-slate-300",
    PEELING: "bg-amber-500/20 text-amber-300",
    DRYING: "bg-blue-500/20 text-blue-300",
    PRESSING: "bg-violet-500/20 text-violet-300",
    FINISHING: "bg-emerald-500/20 text-emerald-300",
    COMPLETED: "bg-emerald-500/20 text-emerald-300",
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ListChecks size={28} /> Production Lists
            </h1>
            <p className="text-slate-400 text-sm mt-1">Create and manage press production lists</p>
          </div>
          {!showCreate && (
            <button onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg active:scale-[0.97]">
              <Plus size={20} /> New List
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
              <h2 className="text-white font-bold text-lg">New Production List</h2>
              <button onClick={() => { setShowCreate(false); setItems([]); resetItem(); }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            {order && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-blue-300 text-sm font-semibold">📦 From Order: {order.orderNumber}</p>
                <p className="text-blue-400/70 text-xs">{order.customerName} • {order.items?.length} items</p>
              </div>
            )}

            {/* Added items */}
            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">{item.categoryName} • {item.thicknessValue}mm • {item.sizeLabel}</p>
                      <p className="text-slate-400 text-xs">
                        Qty: {item.quantity}{item.layers && ` • ${item.layers}L`}{item.brandSeal && " • Seal"}{item.varnish && " • Varnish"}
                      </p>
                    </div>
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Item Builder */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-4">
              <p className="text-amber-300 font-semibold text-sm mb-3">
                {step === 0 ? "➊ Select Type" : step === 1 ? "➋ Thickness" : step === 2 ? "➌ Size" : "➍ Quantity & Options"}
              </p>

              {step === 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {catalog.categories?.map((c: any) => (
                    <button key={c.id} onClick={() => { setSelCat(c); setStep(1); }}
                      className="py-4 bg-slate-700 hover:bg-amber-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base">{c.name}</button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Type: <span className="text-white">{selCat?.name}</span></p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {catalog.thicknesses?.map((t: any) => (
                      <button key={t.id} onClick={() => { setSelThick(t); setStep(2); }}
                        className="py-3 bg-slate-700 hover:bg-amber-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
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
                        className="py-3 bg-slate-700 hover:bg-amber-600 text-white font-bold rounded-xl transition active:scale-[0.95]">{s.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setStep(1)} className="mt-2 text-sm text-slate-400">← Back</button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">{selCat?.name} • {selThick?.value}mm • {selSize?.label}</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {qtyPresets.map((q) => (
                      <button key={q} onClick={() => setSelQty(String(q))}
                        className={`py-2.5 rounded-xl font-bold transition active:scale-[0.95] ${selQty === String(q) ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300"}`}>{q}</button>
                    ))}
                  </div>
                  <input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Custom qty" />

                  {selThick?.value === 10 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setSelLayers(5)} className={`py-3 rounded-xl font-bold ${selLayers === 5 ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300"}`}>5 Layer</button>
                      <button onClick={() => setSelLayers(7)} className={`py-3 rounded-xl font-bold ${selLayers === 7 ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300"}`}>7 Layer ⭐</button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSelBrand(!selBrand)}
                      className={`py-3.5 rounded-xl font-semibold text-sm ${selBrand ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                      {selBrand ? "✓ Brand Seal" : "Brand Seal"}
                    </button>
                    <button onClick={() => setSelVarnish(!selVarnish)}
                      className={`py-3.5 rounded-xl font-semibold text-sm ${selVarnish ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                      {selVarnish ? "✓ Varnish" : "Varnish"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={addItem} className="flex-1 py-3.5 bg-amber-600 text-white font-bold rounded-xl active:scale-[0.97]">+ Add Item</button>
                    <button onClick={() => setStep(2)} className="px-4 bg-slate-700 text-slate-300 rounded-xl">←</button>
                  </div>
                </div>
              )}
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)" rows={2}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/50 mb-4" />

            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /><p className="text-sm text-red-300">{error}</p></div>}

            <button onClick={submitList} disabled={items.length === 0}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-30 active:scale-[0.97] transition">
              Create List & Notify Operators ({items.length} items)
            </button>
          </div>
        )}

        {/* EXISTING LISTS */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>
        ) : prodLists.length === 0 && !showCreate ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No production lists yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prodLists.map((list) => (
              <div key={list.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-white font-bold">{list.listNumber}</h3>
                    <p className="text-slate-400 text-xs">
                      {list.order?.orderNumber && `Order: ${list.order.orderNumber} • `}
                      {list.items?.length} items • {list.createdBy?.name}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[list.status]}`}>{list.status}</span>
                </div>
                <div className="space-y-1">
                  {list.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/40 rounded-lg p-2 text-xs">
                      <span className="text-white font-medium">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</span>
                      <span className="text-slate-400 ml-2">Qty: {item.quantity}</span>
                      {item.layers && <span className="text-blue-400 ml-1">• {item.layers}L</span>}
                      {item.brandSeal && <span className="text-emerald-400 ml-1">• Seal</span>}
                      {item.varnish && <span className="text-amber-400 ml-1">• Varnish</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
