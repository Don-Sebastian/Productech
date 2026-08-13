"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, AlertTriangle, Star, Plus } from "lucide-react";

interface CreateOrderModalProps {
  initialOrder?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
  2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
  3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
  4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
  5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
};

const quantityPresets = [25, 50, 100, 200, 300, 500];

export default function CreateOrderModal({ initialOrder, onClose, onSuccess }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customizations, setCustomizations] = useState<any[]>([]);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState(3);
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // Item builder state
  const [step, setStep] = useState(0); // 0=category, 1=thickness, 2=size, 3=quantity+options
  const [selCategory, setSelCategory] = useState<any>(null);
  const [selThickness, setSelThickness] = useState<any>(null);
  const [selSize, setSelSize] = useState<any>(null);
  const [selQuantity, setSelQuantity] = useState("50");
  const [selLayers, setSelLayers] = useState<number | null>(null);
  const [selBrandSeal, setSelBrandSeal] = useState(false);
  const [selVarnish, setSelVarnish] = useState(false);
  const [selCustomizations, setSelCustomizations] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/company-products").then((r) => r.json()),
      fetch("/api/customizations").then((r) => r.json()),
    ])
      .then(([p, custom]) => {
        if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
        if (Array.isArray(custom)) setCustomizations(custom);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading modal catalog data:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customer?.name || "");
      setCustomerPhone(initialOrder.customer?.phone || "");
      setPriority(initialOrder.priority || 3);
      setNotes(initialOrder.notes || "");
      setOrderItems(
        initialOrder.items.map((i: any) => ({
          categoryId: i.categoryId,
          categoryName: i.category?.name,
          thicknessId: i.thicknessId,
          thicknessValue: i.thickness?.value,
          sizeId: i.sizeId,
          sizeLabel: i.size?.label,
          quantity: String(i.quantity),
          layers: i.layers,
          brandSeal: i.brandSeal,
          varnish: i.varnish,
          customizations: i.customizations?.map((c: any) => (typeof c === "string" ? c : c.id)) || [],
        }))
      );
    }
  }, [initialOrder]);

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
      .map((p) => p.size)
      .filter(Boolean)
      .sort((a, b) => {
        if (a.length !== b.length) return b.length - a.length;
        return b.width - a.width;
      });
  };

  const resetItemForm = () => {
    setStep(0);
    setSelCategory(null);
    setSelThickness(null);
    setSelSize(null);
    setSelQuantity("50");
    setSelLayers(null);
    setSelBrandSeal(false);
    setSelVarnish(false);
    setSelCustomizations([]);
  };

  const addItemToOrder = () => {
    if (!selCategory || !selThickness || !selSize || !selQuantity) return;
    setOrderItems([
      ...orderItems,
      {
        categoryId: selCategory.id,
        categoryName: selCategory.name,
        thicknessId: selThickness.id,
        thicknessValue: selThickness.value,
        sizeId: selSize.id,
        sizeLabel: selSize.label,
        quantity: selQuantity,
        layers: selLayers,
        brandSeal: selBrandSeal,
        varnish: selVarnish,
        customizations: selCustomizations,
      },
    ]);
    resetItemForm();
  };

  const submitOrder = async () => {
    if (!customerName || orderItems.length === 0) {
      setError("Customer name and at least one item required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const url = initialOrder ? `/api/orders/${initialOrder.id}` : "/api/orders";
      const method = initialOrder ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          priority,
          notes,
          items: orderItems.map((i) => ({
            categoryId: i.categoryId,
            thicknessId: i.thicknessId,
            sizeId: i.sizeId,
            quantity: i.quantity,
            layers: i.layers,
            brandSeal: i.brandSeal,
            varnish: i.varnish,
            customizations: i.customizations,
          })),
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create order");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-start justify-center pt-8">
        <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">{initialOrder ? "Edit Order" : "New Order"}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Customer Info */}
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Customer / Company name"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">Phone (optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Priority 1-5 */}
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Priority (1 = Highest)</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((p) => {
                  const pc = priorityConfig[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-3 rounded-xl font-bold text-sm transition active:scale-[0.95] ${
                        priority === p ? `${pc.bg} ${pc.color} ring-2 ring-current` : "bg-slate-700 text-slate-400"
                      }`}
                    >
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
                      <button
                        onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                        className="p-2 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
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
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelCategory(c);
                        setStep(1);
                      }}
                      className="py-4 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base"
                    >
                      {c.name}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <p className="col-span-3 text-slate-500 text-center py-4 text-sm">
                      No products in catalog. Add products via Settings → Catalog first.
                    </p>
                  )}
                </div>
              )}

              {/* Step 1: Thickness */}
              {step === 1 && selCategory && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">
                    Category: <span className="text-white font-semibold">{selCategory?.name}</span>
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {getThicknesses(selCategory?.name).map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelThickness(t);
                          setStep(2);
                        }}
                        className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg"
                      >
                        {t.value}
                        <span className="text-xs opacity-60">mm</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep(0)} className="mt-2 text-sm text-slate-400 hover:text-blue-400">
                    ← Back
                  </button>
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
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelSize(s);
                          setStep(3);
                        }}
                        className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-sm"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setStep(1);
                      setSelThickness(null);
                    }}
                    className="mt-2 text-sm text-slate-400"
                  >
                    ← Back
                  </button>
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
                        <button
                          key={q}
                          onClick={() => setSelQuantity(String(q))}
                          className={`py-2.5 rounded-xl font-bold transition active:scale-[0.95] ${
                            selQuantity === String(q) ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={selQuantity}
                      onChange={(e) => setSelQuantity(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Custom quantity"
                    />
                  </div>

                  {/* Layers option (for 10mm thickness) */}
                  {selThickness?.value === 10 && (
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block">Layers</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelLayers(5)}
                          className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${
                            selLayers === 5 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          5 Layer
                        </button>
                        <button
                          onClick={() => setSelLayers(7)}
                          className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${
                            selLayers === 7 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          7 Layer ⭐
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Brand Seal & Varnish toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelBrandSeal(!selBrandSeal)}
                      className={`py-3.5 rounded-xl font-semibold transition active:scale-[0.95] text-sm ${
                        selBrandSeal ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {selBrandSeal ? "✓ Brand Seal" : "Brand Seal"}
                    </button>
                    <button
                      onClick={() => setSelVarnish(!selVarnish)}
                      className={`py-3.5 rounded-xl font-semibold transition active:scale-[0.95] text-sm ${
                        selVarnish ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {selVarnish ? "✓ Varnish" : "Varnish"}
                    </button>
                  </div>

                  {/* Order Customizations */}
                  {customizations.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <label className="text-xs text-slate-400 mb-2 block">Customizations</label>
                      <div className="flex flex-wrap gap-2">
                        {customizations.map((c) => {
                          const isSelected = selCustomizations.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                if (isSelected) setSelCustomizations(selCustomizations.filter((id) => id !== c.id));
                                else setSelCustomizations([...selCustomizations, c.id]);
                              }}
                              className={`py-2 px-3 rounded-lg text-xs font-semibold transition active:scale-[0.95] ${
                                isSelected ? "bg-cyan-600/30 text-cyan-300 ring-1 ring-cyan-500/50" : "bg-slate-700 text-slate-400"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={addItemToOrder}
                      className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 active:scale-[0.97] transition"
                    >
                      + Add Item
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 py-3.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition"
                    >
                      ←
                    </button>
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order notes (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            {/* Submit */}
            <button
              onClick={submitOrder}
              disabled={submitting || orderItems.length === 0 || !customerName}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition flex items-center justify-center gap-2"
            >
              {submitting && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />}
              {initialOrder ? `Save Changes (${orderItems.length} items)` : `Create Order (${orderItems.length} items)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
