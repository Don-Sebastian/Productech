"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Layers, Package, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export default function OwnerCatalog() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [catalog, setCatalog] = useState<any>({ categories: [], thicknesses: [], sizes: [] });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0); // 0=cat, 1=thick, 2=size
  const [selCat, setSelCat] = useState<any>(null);
  const [selThick, setSelThick] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Catalog management state
  const [mgmtTab, setMgmtTab] = useState<"products" | "categories" | "thicknesses" | "sizes">("products");
  const [newCatName, setNewCatName] = useState("");
  const [newThickVal, setNewThickVal] = useState("");
  const [newSizeLength, setNewSizeLength] = useState("");
  const [newSizeWidth, setNewSizeWidth] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/company-products").then((r) => r.json()),
    ]).then(([c, p]) => {
      setCatalog(c);
      if (Array.isArray(p)) setProducts(p);
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const addProduct = async (sizeId: string) => {
    setError("");
    try {
      const res = await fetch("/api/company-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selCat.id, thicknessId: selThick.id, sizeId }),
      });
      if (res.ok) {
        setSuccess("Product added!");
        fetchData();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const toggleProduct = async (id: string, isActive: boolean) => {
    await fetch("/api/company-products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    fetchData();
  };

  const addCatalogItem = async (type: string) => {
    let body: any;
    if (type === "category") {
      if (!newCatName) return;
      body = { type: "category", action: "create", data: { name: newCatName } };
    } else if (type === "thickness") {
      if (!newThickVal) return;
      body = { type: "thickness", action: "create", data: { value: newThickVal } };
    } else {
      if (!newSizeLength || !newSizeWidth) return;
      body = { type: "size", action: "create", data: { label: `${newSizeLength}×${newSizeWidth}`, length: newSizeLength, width: newSizeWidth } };
    }
    await fetch("/api/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setNewCatName(""); setNewThickVal(""); setNewSizeLength(""); setNewSizeWidth("");
    fetchData();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>;
  }

  // Group products by category → thickness for display
  const grouped: Record<string, Record<string, any[]>> = {};
  products.filter((p) => p.isActive).forEach((p) => {
    const catName = p.category?.name || "Unknown";
    const thickLabel = `${p.thickness?.value}mm`;
    if (!grouped[catName]) grouped[catName] = {};
    if (!grouped[catName][thickLabel]) grouped[catName][thickLabel] = [];
    grouped[catName][thickLabel].push(p);
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Product Catalog</h1>
          <p className="text-slate-400 text-sm">Configure your company&apos;s plywood products</p>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {([
            { key: "products" as const, label: "Products", count: products.filter((p) => p.isActive).length },
            { key: "categories" as const, label: "Types", count: catalog.categories?.length || 0 },
            { key: "thicknesses" as const, label: "Thickness", count: catalog.thicknesses?.length || 0 },
            { key: "sizes" as const, label: "Sizes", count: catalog.sizes?.length || 0 },
          ]).map((t) => (
            <button key={t.key} onClick={() => { setMgmtTab(t.key); setShowAdd(false); }}
              className={`py-3 rounded-xl font-semibold text-sm transition ${
                mgmtTab === t.key
                  ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg"
                  : "bg-slate-800/50 text-slate-400"
              }`}>
              {t.label} <span className="text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-semibold">✓ {success}</div>}
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}

        {/* ===================== PRODUCTS TAB ===================== */}
        {mgmtTab === "products" && (
          <div>
            {/* Add Product Button */}
            <button onClick={() => { setShowAdd(true); setAddStep(0); setSelCat(null); setSelThick(null); }}
              className="w-full mb-4 py-3.5 rounded-xl bg-emerald-600/20 border-2 border-dashed border-emerald-500/40 text-emerald-400 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600/30 active:scale-[0.98] transition">
              <Plus size={20} /> Add Product
            </button>

            {/* Add Product Flow */}
            {showAdd && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-emerald-300 font-semibold text-sm">
                    {addStep === 0 ? "➊ Select Category" : addStep === 1 ? "➋ Select Thickness" : "➌ Select Size(s)"}
                  </p>
                  <button onClick={() => setShowAdd(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
                </div>

                {addStep === 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {catalog.categories?.map((c: any) => (
                      <button key={c.id} onClick={() => { setSelCat(c); setAddStep(1); }}
                        className="py-4 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition active:scale-[0.95]">{c.name}</button>
                    ))}
                  </div>
                )}

                {addStep === 1 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Category: <span className="text-white">{selCat?.name}</span></p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {catalog.thicknesses?.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelThick(t); setAddStep(2); }}
                          className="py-3 bg-slate-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
                          {t.value}<span className="text-xs opacity-60">mm</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setAddStep(0)} className="mt-2 text-sm text-slate-400">← Back</button>
                  </div>
                )}

                {addStep === 2 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{selCat?.name} • <span className="text-white">{selThick?.value}mm</span></p>
                    <p className="text-xs text-slate-500 mb-2">Tap sizes to add. Already added ones are grayed out.</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {catalog.sizes?.map((s: any) => {
                        const exists = products.some((p) => p.categoryId === selCat.id && p.thicknessId === selThick.id && p.sizeId === s.id && p.isActive);
                        return (
                          <button key={s.id} onClick={() => !exists && addProduct(s.id)}
                            disabled={exists}
                            className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${
                              exists ? "bg-emerald-900/30 text-emerald-500/50 cursor-not-allowed" : "bg-slate-700 hover:bg-emerald-600 text-white"
                            }`}>{s.label} {exists && "✓"}</button>
                        );
                      })}
                    </div>
                    <button onClick={() => setAddStep(1)} className="mt-2 text-sm text-slate-400">← Back</button>
                  </div>
                )}
              </div>
            )}

            {/* Products grouped by category → thickness */}
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No products configured. Add your first product above.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([catName, thicknesses]) => (
                  <div key={catName}>
                    <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Layers size={18} className="text-emerald-400" /> {catName}
                    </h2>
                    {Object.entries(thicknesses).map(([thickLabel, prods]) => (
                      <div key={thickLabel} className="mb-3">
                        <p className="text-slate-400 text-sm font-semibold mb-2 ml-1">{thickLabel}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {prods.map((p: any) => (
                            <div key={p.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 text-center relative group">
                              <p className="text-white font-bold text-sm">{p.size?.label}</p>
                              <p className="text-slate-500 text-xs mt-1">Stock: {p.currentStock}</p>
                              <button onClick={() => toggleProduct(p.id, p.isActive)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== CATEGORIES TAB ===================== */}
        {mgmtTab === "categories" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category name"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button onClick={() => addCatalogItem("category")} className="px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catalog.categories?.map((c: any) => (
                <div key={c.id} className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-white font-bold text-lg">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== THICKNESSES TAB ===================== */}
        {mgmtTab === "thicknesses" && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              <input type="number" value={newThickVal} onChange={(e) => setNewThickVal(e.target.value)} placeholder="e.g. 19"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <span className="text-slate-400">mm</span>
              <button onClick={() => addCatalogItem("thickness")} className="px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {catalog.thicknesses?.map((t: any) => (
                <div key={t.id} className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-white">{t.value}</p>
                  <p className="text-slate-400 text-sm">mm</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== SIZES TAB ===================== */}
        {mgmtTab === "sizes" && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              <input type="number" step="0.25" value={newSizeLength} onChange={(e) => setNewSizeLength(e.target.value)} placeholder="Length"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <span className="text-slate-400 text-2xl">×</span>
              <input type="number" step="0.25" value={newSizeWidth} onChange={(e) => setNewSizeWidth(e.target.value)} placeholder="Width"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button onClick={() => addCatalogItem("size")} className="px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {catalog.sizes?.map((s: any) => (
                <div key={s.id} className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{s.label}</p>
                  <p className="text-slate-400 text-xs">{s.length}ft × {s.width}ft</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
