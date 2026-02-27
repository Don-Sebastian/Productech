"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Package, Clock, CheckCircle, Truck, Ban, ChevronDown, ChevronUp, Trash2, AlertTriangle } from "lucide-react";

export default function ManagerOrders() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>({ categories: [], thicknesses: [], sizes: [] });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // New order form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // Current item being built
  const [step, setStep] = useState(0); // 0=category, 1=thickness, 2=size, 3=quantity+options
  const [selCategory, setSelCategory] = useState<any>(null);
  const [selThickness, setSelThickness] = useState<any>(null);
  const [selSize, setSelSize] = useState<any>(null);
  const [selQuantity, setSelQuantity] = useState("50");
  const [selLayers, setSelLayers] = useState<number | null>(null);
  const [selBrandSeal, setSelBrandSeal] = useState(false);
  const [selVarnish, setSelVarnish] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !(["MANAGER", "OWNER"] as string[]).includes((session?.user as any)?.role)) router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
    ]).then(([o, c]) => {
      if (Array.isArray(o)) setOrders(o);
      setCatalog(c);
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const resetItemForm = () => {
    setStep(0); setSelCategory(null); setSelThickness(null); setSelSize(null);
    setSelQuantity("50"); setSelLayers(null); setSelBrandSeal(false); setSelVarnish(false);
  };

  const addItemToOrder = () => {
    if (!selCategory || !selThickness || !selSize || !selQuantity) return;
    setOrderItems([...orderItems, {
      categoryId: selCategory.id, categoryName: selCategory.name,
      thicknessId: selThickness.id, thicknessValue: selThickness.value,
      sizeId: selSize.id, sizeLabel: selSize.label,
      quantity: selQuantity, layers: selLayers, brandSeal: selBrandSeal, varnish: selVarnish,
    }]);
    resetItemForm();
  };

  const submitOrder = async () => {
    if (!customerName || orderItems.length === 0) {
      setError("Customer name and at least one item required");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName, customerPhone, priority, notes,
          items: orderItems.map((i) => ({
            categoryId: i.categoryId, thicknessId: i.thicknessId, sizeId: i.sizeId,
            quantity: i.quantity, layers: i.layers, brandSeal: i.brandSeal, varnish: i.varnish,
          })),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setCustomerName(""); setCustomerPhone(""); setPriority("NORMAL"); setNotes("");
        setOrderItems([]); resetItemForm();
        fetchData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create order");
      }
    } catch { setError("Network error"); }
  };

  const deleteOrder = async (id: string) => {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    PENDING: { icon: Clock, color: "text-amber-300", bg: "bg-amber-500/20" },
    CONFIRMED: { icon: CheckCircle, color: "text-blue-300", bg: "bg-blue-500/20" },
    IN_PRODUCTION: { icon: Package, color: "text-violet-300", bg: "bg-violet-500/20" },
    COMPLETED: { icon: Truck, color: "text-emerald-300", bg: "bg-emerald-500/20" },
    CANCELLED: { icon: Ban, color: "text-red-300", bg: "bg-red-500/20" },
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-500/20 text-slate-300",
    NORMAL: "bg-blue-500/20 text-blue-300",
    HIGH: "bg-amber-500/20 text-amber-300",
    URGENT: "bg-red-500/20 text-red-300",
  };

  const quantityPresets = [25, 50, 100, 200, 300, 500];

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Orders</h1>
            <p className="text-slate-400 text-sm">{orders.length} total orders</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg active:scale-[0.97] transition">
            <Plus size={20} /> New Order
          </button>
        </div>

        {/* CREATE ORDER FLOW */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen p-4 flex items-start justify-center pt-8">
              <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">New Order</h2>
                  <button onClick={() => { setShowCreate(false); resetItemForm(); setOrderItems([]); }} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Customer Info */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5 font-medium">Customer Name *</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Customer / Company name" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1.5 font-medium">Phone (optional)</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="+91 9876543210" />
                  </div>

                  {/* Priority - Large buttons */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">Priority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                        <button key={p} onClick={() => setPriority(p)}
                          className={`py-3 rounded-xl font-semibold text-sm transition active:scale-[0.95] ${
                            priority === p ? "bg-blue-600 text-white ring-2 ring-blue-400" : "bg-slate-700 text-slate-400"
                          }`}>{p}</button>
                      ))}
                    </div>
                  </div>

                  {/* Added Items */}
                  {orderItems.length > 0 && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2 font-medium">Items ({orderItems.length})</label>
                      <div className="space-y-2">
                        {orderItems.map((item, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">
                                {item.categoryName} • {item.thicknessValue}mm • {item.sizeLabel}
                              </p>
                              <p className="text-slate-400 text-xs">
                                Qty: {item.quantity}
                                {item.layers && ` • ${item.layers}-layer`}
                                {item.brandSeal && " • Seal"}
                                {item.varnish && " • Varnish"}
                              </p>
                            </div>
                            <button onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADD ITEM - Step by step */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                    <p className="text-blue-300 font-semibold text-sm mb-3">
                      {step === 0 && "➊ Select Type"}
                      {step === 1 && "➋ Select Thickness"}
                      {step === 2 && "➌ Select Size"}
                      {step === 3 && "➍ Quantity & Options"}
                    </p>

                    {/* Step 0: Category */}
                    {step === 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {catalog.categories?.map((c: any) => (
                          <button key={c.id} onClick={() => { setSelCategory(c); setStep(1); }}
                            className="py-4 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 1: Thickness */}
                    {step === 1 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Type: <span className="text-white font-semibold">{selCategory?.name}</span></p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {catalog.thicknesses?.map((t: any) => (
                            <button key={t.id} onClick={() => { setSelThickness(t); setStep(2); }}
                              className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
                              {t.value}<span className="text-xs opacity-60">mm</span>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStep(0)} className="mt-2 text-sm text-slate-400 hover:text-blue-400">← Back</button>
                      </div>
                    )}

                    {/* Step 2: Size */}
                    {step === 2 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">
                          {selCategory?.name} • <span className="text-white font-semibold">{selThickness?.value}mm</span>
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {catalog.sizes?.map((s: any) => (
                            <button key={s.id} onClick={() => { setSelSize(s); setStep(3); }}
                              className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-sm">
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setStep(1)} className="mt-2 text-sm text-slate-400 hover:text-blue-400">← Back</button>
                      </div>
                    )}

                    {/* Step 3: Quantity + Options */}
                    {step === 3 && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">
                          {selCategory?.name} • {selThickness?.value}mm • <span className="text-white font-semibold">{selSize?.label}</span>
                        </p>

                        {/* Quantity presets */}
                        <div>
                          <label className="text-xs text-slate-400 mb-1.5 block">Quantity (sheets)</label>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            {quantityPresets.map((q) => (
                              <button key={q} onClick={() => setSelQuantity(String(q))}
                                className={`py-2.5 rounded-xl font-bold transition active:scale-[0.95] ${
                                  selQuantity === String(q) ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                                }`}>{q}</button>
                            ))}
                          </div>
                          <input type="number" value={selQuantity} onChange={(e) => setSelQuantity(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-blue-500/50"
                            placeholder="Custom quantity" />
                        </div>

                        {/* Layers option (for 10mm thickness) */}
                        {selThickness?.value === 10 && (
                          <div>
                            <label className="text-xs text-slate-400 mb-1.5 block">Layers</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setSelLayers(5)}
                                className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${selLayers === 5 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                                5 Layer
                              </button>
                              <button onClick={() => setSelLayers(7)}
                                className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${selLayers === 7 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                                7 Layer ⭐
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Brand Seal & Varnish toggles */}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setSelBrandSeal(!selBrandSeal)}
                            className={`py-3.5 rounded-xl font-semibold transition active:scale-[0.95] text-sm ${
                              selBrandSeal ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                            }`}>
                            {selBrandSeal ? "✓ Brand Seal" : "Brand Seal"}
                          </button>
                          <button onClick={() => setSelVarnish(!selVarnish)}
                            className={`py-3.5 rounded-xl font-semibold transition active:scale-[0.95] text-sm ${
                              selVarnish ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                            }`}>
                            {selVarnish ? "✓ Varnish" : "Varnish"}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={addItemToOrder}
                            className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 active:scale-[0.97] transition">
                            + Add Item
                          </button>
                          <button onClick={() => setStep(2)} className="px-4 py-3.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition">←</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button onClick={submitOrder} disabled={orderItems.length === 0 || !customerName}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition">
                    Create Order ({orderItems.length} items)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS LIST */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = sc.icon;
              const isExpanded = expandedOrder === order.id;
              return (
                <div key={order.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">
                  {/* Order Header */}
                  <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={18} className={sc.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-bold text-sm">{order.orderNumber}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[order.priority]}`}>{order.priority}</span>
                        </div>
                        <p className="text-slate-400 text-xs truncate">{order.customerName} • {order.items?.length} item(s)</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-slate-500" size={18} /> : <ChevronDown className="text-slate-500" size={18} />}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-3">
                      {/* Items */}
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/40 rounded-xl p-3">
                          <p className="text-white font-semibold text-sm">
                            {item.category?.name} • {item.thickness?.value}mm • {item.size?.label}
                          </p>
                          <p className="text-slate-400 text-xs mt-1">
                            Qty: <span className="text-white font-medium">{item.quantity}</span>
                            {item.layers && <> • {item.layers}-layer</>}
                            {item.brandSeal && <> • <span className="text-emerald-400">Brand Seal</span></>}
                            {item.varnish && <> • <span className="text-amber-400">Varnish</span></>}
                          </p>
                        </div>
                      ))}

                      {/* Status Change Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {order.status === "PENDING" && (
                          <button onClick={() => updateStatus(order.id, "CONFIRMED")}
                            className="py-2.5 bg-blue-600/20 text-blue-300 font-semibold rounded-xl text-sm hover:bg-blue-600/30 active:scale-[0.97] transition">
                            ✓ Confirm
                          </button>
                        )}
                        {order.status === "CONFIRMED" && (
                          <button onClick={() => updateStatus(order.id, "IN_PRODUCTION")}
                            className="py-2.5 bg-violet-600/20 text-violet-300 font-semibold rounded-xl text-sm active:scale-[0.97] transition">
                            🏭 Start Production
                          </button>
                        )}
                        {order.status === "IN_PRODUCTION" && (
                          <button onClick={() => updateStatus(order.id, "COMPLETED")}
                            className="py-2.5 bg-emerald-600/20 text-emerald-300 font-semibold rounded-xl text-sm active:scale-[0.97] transition">
                            ✓ Complete
                          </button>
                        )}
                        {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                          <>
                            {deleteConfirm === order.id ? (
                              <div className="col-span-2 flex gap-2">
                                <button onClick={() => deleteOrder(order.id)}
                                  className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl text-sm active:scale-[0.97]">Delete</button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(order.id)}
                                className="py-2.5 bg-red-600/20 text-red-300 font-semibold rounded-xl text-sm active:scale-[0.97] transition">
                                🗑 Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
