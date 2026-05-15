"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Package, Clock, CheckCircle, Truck, Ban, ChevronDown, ChevronUp, Trash2, AlertTriangle, Star, CalendarClock } from "lucide-react";
import { calcListProductionMinutes, calcEstimatedDates, formatDate, formatDays, type PressSettings } from "@/lib/productionEstimate";

export default function ManagerOrders() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [pressSettings, setPressSettings] = useState<PressSettings>({ workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 });
  const [productTimings, setProductTimings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customizations, setCustomizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  // New order form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState(3);
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
  const [selCustomizations, setSelCustomizations] = useState<string[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [confirmDispatchId, setConfirmDispatchId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !(["MANAGER", "OWNER"] as string[]).includes((session?.user as any)?.role)) router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/company-products").then((r) => r.json()),
      fetch("/api/customizations").then((r) => r.json()),
    ]).then(([o, p, custom]) => {
      // Handle new { orders, pressSettings, productTimings } shape
      if (o && Array.isArray(o.orders)) {
        setOrders(o.orders);
        if (o.pressSettings) setPressSettings(o.pressSettings);
        if (o.productTimings) setProductTimings(o.productTimings);
      } else if (Array.isArray(o)) {
        setOrders(o);
      }
      if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
      if (Array.isArray(custom)) setCustomizations(custom);
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  // Derived properties from products (catalog-based)
  const categories = [...new Map(products.map((p) => [p.category?.name, p.category])).values()]
    .filter(Boolean)
    .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));

  const getThicknesses = (catName: string) => {
    const filtered = products.filter((p) => p.category?.name === catName);
    return [...new Map(filtered.map((p) => [p.thickness?.value, p.thickness])).values()]
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);
  };
  const getSizes = (catName: string, thickVal: number) => {
    return products
      .filter((p) => p.category?.name === catName && p.thickness?.value === thickVal)
      .map(p => p.size)
      .filter(Boolean)
      .sort((a, b) => {
        if (a.length !== b.length) return b.length - a.length;
        return b.width - a.width;
      });
  };

  const resetItemForm = () => {
    setStep(0); setSelCategory(null); setSelThickness(null); setSelSize(null);
    setSelQuantity("50"); setSelLayers(null); setSelBrandSeal(false); setSelVarnish(false);
    setSelCustomizations([]);
  };

  const openEditModal = (order: any) => {
    setEditingOrderId(order.id);
    setCustomerName(order.customer?.name || "");
    setPriority(order.priority || 3);
    setNotes(order.notes || "");
    setOrderItems(order.items.map((i: any) => ({
      categoryId: i.categoryId, categoryName: i.category?.name,
      thicknessId: i.thicknessId, thicknessValue: i.thickness?.value,
      sizeId: i.sizeId, sizeLabel: i.size?.label,
      quantity: String(i.quantity), layers: i.layers, brandSeal: i.brandSeal, varnish: i.varnish,
      customizations: i.customizations || []
    })));
    setShowCreate(true);
  };

  const addItemToOrder = () => {
    if (!selCategory || !selThickness || !selSize || !selQuantity) return;
    setOrderItems([...orderItems, {
      categoryId: selCategory.id, categoryName: selCategory.name,
      thicknessId: selThickness.id, thicknessValue: selThickness.value,
      sizeId: selSize.id, sizeLabel: selSize.label,
      quantity: selQuantity, layers: selLayers, brandSeal: selBrandSeal, varnish: selVarnish,
      customizations: selCustomizations,
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
      const url = editingOrderId ? `/api/orders/${editingOrderId}` : "/api/orders";
      const method = editingOrderId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName, customerPhone, priority, notes,
          items: orderItems.map((i) => ({
            categoryId: i.categoryId, thicknessId: i.thicknessId, sizeId: i.sizeId,
            quantity: i.quantity, layers: i.layers, brandSeal: i.brandSeal, varnish: i.varnish,
            customizations: i.customizations,
          })),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setEditingOrderId(null);
        setCustomerName(""); setCustomerPhone(""); setPriority(3); setNotes("");
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

  const updatePriority = async (id: string, newPriority: number) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    fetchData();
  };

  const handleDispatch = async (id: string) => {
    try {
      await updateStatus(id, "READY_FOR_DISPATCH");
      setConfirmDispatchId(null);
    } catch {
      alert("Network error");
    }
  };



  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    PENDING: { icon: Clock, color: "text-amber-300", bg: "bg-amber-500/20", label: "Pending" },
    CONFIRMED: { icon: CheckCircle, color: "text-blue-300", bg: "bg-blue-500/20", label: "Confirmed" },
    IN_PRODUCTION: { icon: Package, color: "text-violet-300", bg: "bg-violet-500/20", label: "In Production" },
    PRODUCTION_COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20", label: "✅ Ready to Dispatch" },
    READY_FOR_DISPATCH: { icon: Truck, color: "text-teal-300", bg: "bg-teal-500/20", label: "Ready for Dispatch" },
    DISPATCHED: { icon: Truck, color: "text-sky-300", bg: "bg-sky-500/20", label: "Dispatched" },
    COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20", label: "Completed" },
    CANCELLED: { icon: Ban, color: "text-red-300", bg: "bg-red-500/20", label: "Cancelled" },
  };

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  const quantityPresets = [25, 50, 100, 200, 300, 500];

  // Sort orders: by priority (1 first), then createdAt desc
  const [sortedOrders, displayOrders] = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const active = sorted.filter(o => !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
    const history = sorted.filter(o => ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
    return [sorted, viewMode === "ACTIVE" ? active : history];
  }, [orders, viewMode]);

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Orders</h1>
              <p className="text-slate-400 text-sm">{orders.length} total orders</p>
            </div>
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-1 flex">
              <button 
                onClick={() => setViewMode("ACTIVE")} 
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${viewMode === "ACTIVE" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
              >
                Active
              </button>
              <button 
                onClick={() => setViewMode("HISTORY")} 
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${viewMode === "HISTORY" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
              >
                History
              </button>
            </div>
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
                  <h2 className="text-xl font-bold text-white">{editingOrderId ? "Edit Order" : "New Order"}</h2>
                  <button onClick={() => { setShowCreate(false); setEditingOrderId(null); resetItemForm(); setOrderItems([]); setCustomerName(""); setNotes(""); setPriority(3); }} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"><X size={20} /></button>
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

                  {/* Priority 1-5 */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2 font-medium">Priority (1 = Highest)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((p) => {
                        const pc = priorityConfig[p];
                        return (
                          <button key={p} onClick={() => setPriority(p)}
                            className={`py-3 rounded-xl font-bold text-sm transition active:scale-[0.95] ${
                              priority === p ? `${pc.bg} ${pc.color} ring-2 ring-current` : "bg-slate-700 text-slate-400"
                            }`}>
                            <Star size={14} className={`inline mr-1 ${priority === p ? "fill-current" : ""}`} />
                            {p}
                          </button>
                        );
                      })}
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
                      {step === 0 && "➊ Select Category"}
                      {step === 1 && "➋ Select Thickness"}
                      {step === 2 && "➌ Select Size"}
                      {step === 3 && "➍ Quantity & Options"}
                    </p>

                    {/* Step 0: Category */}
                    {step === 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {categories.map((c: any) => (
                          <button key={c.id} onClick={() => { setSelCategory(c); setStep(1); }}
                            className="py-4 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base">
                            {c.name}
                          </button>
                        ))}
                        {categories.length === 0 && (
                          <p className="col-span-3 text-slate-500 text-center py-4 text-sm">No products in catalog. Add products via Settings → Catalog first.</p>
                        )}
                      </div>
                    )}

                    {/* Step 1: Thickness */}
                    {step === 1 && selCategory && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Category: <span className="text-white font-semibold">{selCategory?.name}</span></p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {getThicknesses(selCategory?.name).map((t: any) => (
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
                    {step === 2 && selCategory && selThickness && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">
                          {selCategory?.name} • <span className="text-white font-semibold">{selThickness?.value}mm</span>
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {getSizes(selCategory?.name, selThickness?.value).map((s: any) => (
                            <button key={s.id} onClick={() => { setSelSize(s); setStep(3); }}
                              className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-sm">
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => { setStep(1); setSelThickness(null); }} className="mt-2 text-sm text-slate-400">← Back</button>
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

                        {/* Order Customizations */}
                        {customizations.length > 0 && (
                          <div className="pt-2 border-t border-slate-700/50">
                            <label className="text-xs text-slate-400 mb-2 block">Customizations</label>
                            <div className="flex flex-wrap gap-2">
                              {customizations.map(c => {
                                const isSelected = selCustomizations.includes(c.id);
                                return (
                                  <button key={c.id} onClick={() => {
                                      if (isSelected) setSelCustomizations(selCustomizations.filter(id => id !== c.id));
                                      else setSelCustomizations([...selCustomizations, c.id]);
                                    }}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition active:scale-[0.95] ${
                                      isSelected ? "bg-cyan-600/30 text-cyan-300 ring-1 ring-cyan-500/50" : "bg-slate-700 text-slate-400"
                                    }`}>
                                    {c.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

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

                  {/* Notes */}
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes (optional)" rows={2}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50" />

                  {/* Submit */}
                  <button onClick={submitOrder} disabled={orderItems.length === 0 || !customerName}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition">
                    {editingOrderId ? `Save Changes (${orderItems.length} items)` : `Create Order (${orderItems.length} items)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS LIST */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No {viewMode === "ACTIVE" ? "active" : "historical"} orders found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayOrders.map((order: any) => {
              const sc = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = sc.icon;
              const isExpanded = expandedOrder === order.id;
              const pc = priorityConfig[order.priority] || priorityConfig[3];
              
              const orderTargetQty = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
              const orderProducedQty = order.productionLists?.reduce((s: number, pl: any) => s + pl.items?.reduce((ps: number, item: any) => ps + (item.producedQuantity || 0), 0), 0) || 0;
              const progressPercent = orderTargetQty > 0 ? Math.min(100, Math.round((orderProducedQty / orderTargetQty) * 100)) : 0;
              
              const isProductionComplete = order.status === "PRODUCTION_COMPLETED" || (progressPercent >= 100 && !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status));

              // Estimation
              const prodMinutes = calcListProductionMinutes(
                (order.items || []).map((i: any) => ({
                  quantity: i.quantity,
                  categoryId: i.categoryId,
                  thicknessId: i.thicknessId,
                })),
                productTimings,
                pressSettings
              );
              const hasTimings = prodMinutes > 0;
              const { dispatchDate, productionDays } = hasTimings
                ? calcEstimatedDates(order.createdAt, prodMinutes, pressSettings)
                : { dispatchDate: null, productionDays: 0 };

              return (
                <div key={order.id} className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all ${
                  isProductionComplete ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : "border-slate-700/50"
                }`}>
                  {/* Order Header */}
                  <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full p-4 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={18} className={sc.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-blue-400 font-black uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 ">
                              {order.customer?.name}
                            </span>
                          <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {order.orderNumber}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pc.bg} ${pc.color}`}>{pc.label}</span>
                          {isProductionComplete && order.status !== "READY_FOR_DISPATCH" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">
                              ✅ Ready
                            </span>
                          )}
                          {order.status === "READY_FOR_DISPATCH" && (
                            <span className="text-xs px-2 py-1 rounded-full bg-teal-500/25 text-teal-300 font-black flex items-center gap-1 border border-teal-500/30 shadow-lg shadow-teal-900/20">
                              <Truck size={12} /> Marked for Dispatch
                            </span>
                          )}
                          
                          {/* Persisted Dispatch Date from Database takes priority */}
                          {order.estimatedDispatchDate && !["DISPATCHED","COMPLETED","CANCELLED"].includes(order.status) && (
                            <span className="text-xs px-2 py-1 rounded-full bg-violet-600 text-white font-black shadow-lg shadow-violet-900/40 flex items-center gap-1 border border-violet-400/30 animate-pulse">
                              <Truck size={12} className="fill-current" />
                              DISPATCH: {formatDate(new Date(order.estimatedDispatchDate))}
                            </span>
                          )}
                          
                          {/* Fallback to frontend calculation if DB value missing */}
                          {!order.estimatedDispatchDate && hasTimings && dispatchDate && !["DISPATCHED","COMPLETED","CANCELLED"].includes(order.status) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-bold flex items-center gap-1">
                              <CalendarClock size={11} />
                              Est. {formatDate(dispatchDate)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-2">
                            <p className="text-slate-400 text-[10px] flex items-center gap-1">
                              <Plus size={10} /> Created {formatDate(new Date(order.createdAt))}
                            </p>
                            <p className="text-slate-400 text-xs truncate">
                              • {order.items?.length} item(s)
                              {hasTimings && productionDays > 0 && (
                                <span className="ml-2 text-orange-400">• ~{formatDays(productionDays)} production</span>
                              )}
                            </p>
                          </div>
                          {/* Progress Bar */}
                          {!["PENDING", "CANCELLED", "COMPLETED"].includes(order.status) && orderTargetQty > 0 && (
                            <div className="flex items-center gap-2 w-full max-w-[200px]">
                              <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${progressPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${progressPercent}%` }} />
                              </div>
                              <span className={`text-[9px] font-black ${progressPercent >= 100 ? "text-emerald-400" : "text-blue-400"}`}>{orderProducedQty}/{orderTargetQty}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-slate-500" size={18} /> : <ChevronDown className="text-slate-500" size={18} />}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-3">
                      {/* Priority Update */}
                      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && order.status !== "DISPATCHED" && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs text-slate-500">Priority Level</p>
                            <button onClick={() => setEditingPriorityId(editingPriorityId === order.id ? null : order.id)}
                              className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition hover:bg-slate-600">
                              {editingPriorityId === order.id ? "Done" : "Edit Priority"}
                            </button>
                          </div>
                          {editingPriorityId === order.id ? (
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((p) => {
                                const pConf = priorityConfig[p];
                                return (
                                  <button key={p} onClick={async () => { await updatePriority(order.id, p); setEditingPriorityId(null); }}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition active:scale-[0.95] ${
                                      order.priority === p ? `${pConf.bg} ${pConf.color} ring-1 ring-current` : "bg-slate-700/50 text-slate-500 hover:bg-slate-700"
                                    }`}>
                                    P{p}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={`inline-block py-1.5 px-4 rounded-lg text-sm font-bold ${priorityConfig[order.priority]?.bg || "bg-slate-700"} ${priorityConfig[order.priority]?.color || "text-white"}`}>
                              Priority {order.priority}
                            </div>
                          )}
                        </div>
                      )}

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
                            {item.customizations?.map((c: any) => (
                              <span key={c.id}> • <span className="text-cyan-400">{c.name}</span></span>
                            ))}
                          </p>
                        </div>
                      ))}

                      {/* Timeline Events */}
                      {order.timelineEvents && order.timelineEvents.length > 0 && (
                        <div className="mt-4 border-t border-slate-700/50 pt-4">
                          <button 
                            onClick={() => setExpandedTimelineId(expandedTimelineId === order.id ? null : order.id)} 
                            className="w-full flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition"
                          >
                            <span>Order Timeline</span>
                            {expandedTimelineId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          
                          {expandedTimelineId === order.id && (
                            <div className="relative pl-3 space-y-4 mt-4">
                              <div className="absolute left-[3px] top-2 bottom-0 w-0.5 bg-slate-700"></div>
                              {order.timelineEvents.map((event: any, idx: number) => (
                                <div key={idx} className="relative">
                                  <div className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                  <p className="text-sm font-bold text-white leading-none mb-1">{event.action}</p>
                                  <p className="text-xs text-slate-400">{event.details}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(event.createdAt).toLocaleString('en-IN')}</p>
                                    {event.user?.name && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium">{event.user.name}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Change Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {order.status === "PENDING" && (
                          <button onClick={() => updateStatus(order.id, "CONFIRMED")}
                            className="py-2.5 bg-blue-600/20 text-blue-300 font-semibold rounded-xl text-sm hover:bg-blue-600/30 active:scale-[0.97] transition">
                            ✓ Confirm
                          </button>
                        )}
                        
                        {!["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status) && (
                          <div className={`col-span-2 ${order.status === "PENDING" ? "" : "col-span-2"}`}>
                            {order.status === "READY_FOR_DISPATCH" ? (
                              <div className="w-full py-2.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80">
                                <Truck size={16} />
                                ✅ Marked for Dispatch
                              </div>
                            ) : confirmDispatchId === order.id ? (
                              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                                <p className="text-amber-400 text-sm font-bold mb-1">Confirm Mark For Dispatch?</p>
                                <p className="text-amber-500/80 text-xs mb-4">
                                  {progressPercent < 100 
                                    ? `Production is only at ${progressPercent}%. Are you sure you want to mark this order ready for dispatch?` 
                                    : "Are you sure you want to mark this order as ready for dispatch?"}
                                </p>
                                <div className="flex gap-2">
                                  <button onClick={() => handleDispatch(order.id)} className="flex-1 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-lg shadow hover:bg-amber-500 active:scale-95 transition">Yes, Mark Ready</button>
                                  <button onClick={() => setConfirmDispatchId(null)} className="flex-1 py-2.5 bg-slate-700 text-slate-300 font-bold text-sm rounded-lg hover:bg-slate-600 active:scale-95 transition">Cancel</button>
                                </div>
                              </div>
                            ) : (
                               <button onClick={() => setConfirmDispatchId(order.id)}
                                 className="w-full py-2.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold rounded-xl text-sm active:scale-[0.97] transition flex items-center justify-center gap-2 hover:bg-violet-600/30 group">
                                 <Truck size={16} className="transition-transform group-hover:translate-x-1" />
                                 Mark Ready for Dispatch
                               </button>
                            )}
                          </div>
                        )}
                        {order.status !== "CANCELLED" && order.status !== "COMPLETED" && order.status !== "DISPATCHED" && (
                          <div className="col-span-2 flex gap-2">
                            <button onClick={() => openEditModal(order)}
                              className="flex-1 py-2.5 bg-slate-700 border border-slate-600 text-slate-300 font-semibold rounded-xl text-sm hover:text-white transition active:scale-[0.97]">
                              ✎ Edit Order
                            </button>
                            {deleteConfirm === order.id ? (
                              <div className="flex-[2] flex gap-2">
                                <button onClick={() => deleteOrder(order.id)}
                                  className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl text-sm active:scale-[0.97]">Delete</button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(order.id)}
                                className="flex-1 py-2.5 bg-red-600/20 text-red-300 font-semibold rounded-xl text-sm active:scale-[0.97] transition px-4 hidden md:block">
                                🗑
                              </button>
                            )}
                          </div>
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
