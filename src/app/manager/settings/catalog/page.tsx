"use client";
// Catalog page with Rate/SqFt support - v2

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Layers, Package, Trash2 } from "lucide-react";

export default function ManagerCatalog() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [selCat, setSelCat] = useState<any>(null);
  const [selThick, setSelThick] = useState<any>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [mgmtTab, setMgmtTab] = useState<"products" | "categories" | "thicknesses" | "sizes">("products");
  const [newCatName, setNewCatName] = useState("");
  const [newThickVal, setNewThickVal] = useState("");
  const [newSizeLength, setNewSizeLength] = useState("");
  const [newSizeWidth, setNewSizeWidth] = useState("");
  const [newSizeSqft, setNewSizeSqft] = useState("");

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") as any;
    if (["products", "categories", "thicknesses", "sizes"].includes(tab)) {
      setMgmtTab(tab);
    }
  }, [searchParams]);
  
  // Timing state
  const [selTimingCat, setSelTimingCat] = useState<any>(null);
  // Per-category-thickness timing state: { [categoryId-thicknessId]: { cookingTime, coolingTime, ratePerSqft, saving, saved } }
  const [timingMap, setTimingMap] = useState<Record<string, { cookingTime: string; coolingTime: string; ratePerSqft: string; saving: boolean; saved: boolean }>>({});
  // Per-category-thickness specs state: { [categoryId-thicknessId]: { weightPerSheetKg, longCore, glueCore, saving, saved, bomItems } }
  const [specMap, setSpecMap] = useState<Record<string, { weightPerSheetKg: string; longCore: string; glueCore: string; saving: boolean; saved: boolean; bomItems: {materialId: string, quantity: string}[] }>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const { data: pageData, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ["manager-catalog"],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        fetch("/api/catalog").then((r) => r.ok ? r.json() : Promise.reject("Catalog failed")),
        fetch("/api/company-products").then((r) => r.ok ? r.json() : Promise.reject("Products failed")),
      ]);
      return { c, p };
    },
    enabled: status === "authenticated",
  });

  const { catalog, products } = useMemo(() => {
    return {
      catalog: pageData?.c || { categories: [], thicknesses: [], sizes: [], productTimings: [], productSpecs: [], rawMaterials: [], budget: null, standardCosts: [] },
      products: Array.isArray(pageData?.p) ? pageData.p : [],
    };
  }, [pageData]);

  // Standard Overhead per standard sheet (8x4 = 32 sqft)
  const budgetOverheadPerSheet = useMemo(() => {
    const budget = catalog.budget;
    if (!budget?.targetSheets || budget.targetSheets <= 0) return 0;
    return (budget.monthlyOverhead || 0) / budget.targetSheets;
  }, [catalog.budget]);

  // Helper to get standard rate for a raw material
  const getMaterialRate = (materialId: string) => {
    const stdRate = catalog.standardCosts?.find((r: any) => r.materialId === materialId);
    if (stdRate && stdRate.standardPrice > 0) return stdRate.standardPrice;
    const mat = catalog.rawMaterials?.find((m: any) => m.id === materialId);
    return mat?.currentRate || 0;
  };

  // Helper to get BOM description and standardized cost for a product
  const getProductCostAndBOM = (categoryId: string, thicknessId: string, size: any) => {
    const spec = catalog.productSpecs?.find((s: any) => s.categoryId === categoryId && s.thicknessId === thicknessId);
    if (!spec || !spec.bomItems || spec.bomItems.length === 0) {
      return { hasBOM: false, bomDescription: "No BOM configured", mfgCostPerSheet: 0, costPerSqft: 0, scaledBOM: [] };
    }

    const sizeSqft = (size?.length && size?.width) ? (size.length * size.width) : (size?.sqft || 32);
    const scaleFactor = sizeSqft / 32; // Scaling from standard 8x4 (32 sqft)

    let base8x4MaterialCost = 0;
    const scaledBOM = spec.bomItems.map((bi: any) => {
      const mat = catalog.rawMaterials?.find((m: any) => m.id === bi.materialId) || bi.material;
      const rate = getMaterialRate(bi.materialId);
      const baseQty = Number(bi.quantity) || 0;
      const scaledQty = baseQty * scaleFactor;
      const itemCost = scaledQty * rate;
      base8x4MaterialCost += (baseQty * rate);

      return {
        materialId: bi.materialId,
        materialName: mat?.name || "Material",
        category: mat?.category || "Other",
        unit: mat?.unit || "Unit",
        baseQty,
        scaledQty,
        rate,
        itemCost,
      };
    });

    const totalBase8x4Cost = base8x4MaterialCost + budgetOverheadPerSheet;
    const costPerSqft = totalBase8x4Cost / 32;
    const mfgCostPerSheet = costPerSqft * sizeSqft;

    const bomDescription = scaledBOM.map(b => `${b.materialName}: ${b.scaledQty.toFixed(1)} ${b.unit}`).join(" • ");

    return {
      hasBOM: true,
      bomDescription,
      mfgCostPerSheet,
      costPerSqft,
      scaledBOM,
      base8x4MaterialCost,
      scaledMaterialCost: base8x4MaterialCost * scaleFactor,
      scaledOverhead: budgetOverheadPerSheet * scaleFactor,
    };
  };

  useEffect(() => {
    if (!selTimingCat && catalog.categories?.length) setSelTimingCat(catalog.categories[0]);
  }, [catalog.categories, selTimingCat]);

  // Sync timingMap state when catalog loads
  useEffect(() => {
    if (catalog.categories?.length && catalog.thicknesses?.length) {
      setTimingMap((prev) => {
        const next = { ...prev };
        catalog.categories.forEach((cat: any) => {
          catalog.thicknesses.forEach((thick: any) => {
            const key = `${cat.id}-${thick.id}`;
            if (!next[key]) {
              const existing = catalog.productTimings?.find((pt: any) => pt.categoryId === cat.id && pt.thicknessId === thick.id);
              next[key] = {
                cookingTime: existing ? String(existing.cookingTime) : "0",
                coolingTime: existing ? String(existing.coolingTime) : "0",
                ratePerSqft: existing ? String(existing.ratePerSqft || 0) : "0",
                saving: false,
                saved: false,
              };
            }
          });
        });
        return next;
      });

      setSpecMap((prev) => {
        const next = { ...prev };
        catalog.categories.forEach((cat: any) => {
          catalog.thicknesses.forEach((thick: any) => {
            const key = `${cat.id}-${thick.id}`;
            const existing = catalog.productSpecs?.find((ps: any) => ps.categoryId === cat.id && ps.thicknessId === thick.id);
            if (!next[key]) {
              next[key] = {
                weightPerSheetKg: existing ? String(existing.weightPerSheetKg) : "",
                longCore: existing ? String(existing.longCore) : "",
                glueCore: existing ? String(existing.glueCore) : "",
                saving: false,
                saved: false,
                bomItems: existing?.bomItems ? existing.bomItems.map((bi: any) => ({ materialId: bi.materialId, quantity: String(bi.quantity) })) : [],
              };
            } else if (existing && !next[key].saving) {
              // Update with existing specs if previous state was empty
              if (!next[key].weightPerSheetKg && existing.weightPerSheetKg) next[key].weightPerSheetKg = String(existing.weightPerSheetKg);
              if (!next[key].longCore && existing.longCore) next[key].longCore = String(existing.longCore);
              if (!next[key].glueCore && existing.glueCore) next[key].glueCore = String(existing.glueCore);
              if ((!next[key].bomItems || next[key].bomItems.length === 0) && existing.bomItems?.length) {
                next[key].bomItems = existing.bomItems.map((bi: any) => ({ materialId: bi.materialId, quantity: String(bi.quantity) }));
              }
            }
          });
        });
        return next;
      });
    }
  }, [catalog.categories, catalog.thicknesses, catalog.productTimings, catalog.productSpecs]);

  const deleteCatalogItem = async (id: string, type: "category" | "thickness" | "size") => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action: "delete", data: { id } }),
      });
      if (res.ok) {
        fetchData();
        setSuccess(`${type} deleted successfully`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(`Failed to delete ${type}`);
      }
    } catch (err) {
      setError("Error connecting to server");
    }
  };

  const updateProductTiming = async (thicknessId: string) => {
    if (!selTimingCat) return;
    const key = `${selTimingCat.id}-${thicknessId}`;
    const times = timingMap[key];
    if (!times) return;

    setTimingMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: true } }));
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "timing",
          action: "update",
          data: {
            categoryId: selTimingCat.id,
            thicknessId: thicknessId,
            cookingTime: times.cookingTime,
            coolingTime: times.coolingTime,
            ratePerSqft: times.ratePerSqft
          },
        }),
      });
      if (res.ok) {
        setTimingMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, saved: true } }));
        setTimeout(() => setTimingMap((prev) => ({ ...prev, [key]: { ...prev[key], saved: false } })), 2500);
        fetchData();
      } else {
        const errorData = await res.json();
        console.error("Save error:", errorData);
        setTimingMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
        setError(errorData.message || "Failed to save timing");
      }
    } catch (err) {
      console.error(err);
      setTimingMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
      setError("Network error saving timing");
    }
  };

  const updateProductSpec = async (thicknessId: string) => {
    if (!selTimingCat) return;
    const key = `${selTimingCat.id}-${thicknessId}`;
    const spec = specMap[key];
    if (!spec) return;

    if (!spec.weightPerSheetKg || !spec.longCore || !spec.glueCore) {
      setError("Please fill Avg Weight (KG), Long Core, and Glue Core before saving");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const filteredBom = (spec.bomItems || [])
      .filter((b) => b.materialId && b.materialId.trim() !== "")
      .map((b) => ({
        materialId: b.materialId.trim(),
        quantity: parseFloat(b.quantity) || 0,
      }));

    setSpecMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: true } }));
    try {
      const res = await fetch("/api/product-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selTimingCat.id,
          thicknessId: thicknessId,
          weightPerSheetKg: spec.weightPerSheetKg,
          longCore: spec.longCore,
          glueCore: spec.glueCore,
          bomItems: filteredBom,
        }),
      });
      if (res.ok) {
        setSpecMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, saved: true } }));
        setTimeout(() => setSpecMap((prev) => ({ ...prev, [key]: { ...prev[key], saved: false } })), 2500);
        fetchData();
      } else {
        let errorMsg = "Failed to save specs";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch {
          errorMsg = `Server error (${res.status})`;
        }
        console.error("Save spec error:", errorMsg);
        setSpecMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      setSpecMap((prev) => ({ ...prev, [key]: { ...prev[key], saving: false } }));
      setError(err?.message || "Network error saving specs");
    }
  };

  const addSelectedProducts = async () => {
    if (selectedSizes.length === 0) return;
    setError("");
    try {
      const res = await fetch("/api/company-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selCat.id, thicknessId: selThick.id, sizeIds: selectedSizes }),
      });
      if (res.ok) {
        setSuccess(`${selectedSizes.length} Product(s) added!`);
        fetchData();
        setSelectedSizes([]);
        setAddStep(0);
        setShowAdd(false);
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
      if (!newSizeLength || !newSizeWidth || !newSizeSqft) return;
      body = { type: "size", action: "create", data: { label: `${newSizeLength}×${newSizeWidth}`, length: newSizeLength, width: newSizeWidth, sqft: newSizeSqft } };
    }
    const res = await fetch("/api/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} added!`);
      setTimeout(() => setSuccess(""), 2000);
    } else {
      const d = await res.json();
      setError(d.error || "Failed to add");
    }
    setNewCatName(""); setNewThickVal(""); setNewSizeLength(""); setNewSizeWidth(""); setNewSizeSqft("");
    fetchData();
  };



  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>;
  }

  const grouped: Record<string, Record<string, any[]>> = {};
  products.filter((p) => p.isActive).forEach((p) => {
    const catName = p.category?.name || "Unknown";
    const thickLabel = `${p.thickness?.value}mm`;
    if (!grouped[catName]) grouped[catName] = {};
    if (!grouped[catName][thickLabel]) grouped[catName][thickLabel] = [];
    grouped[catName][thickLabel].push(p);
  });

  return (
    <div className="h-full flex flex-col pt-2">
      <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Product Catalog</h1>
          <p className="text-slate-400 text-sm">Define what your company produces &mdash; categories, thicknesses, sizes, and product combinations</p>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {([
            { key: "products" as const, label: "Products", count: products.filter((p) => p.isActive).length },
            { key: "categories" as const, label: "Categories", count: catalog.categories?.length || 0 },
            { key: "thicknesses" as const, label: "Thickness", count: catalog.thicknesses?.length || 0 },
            { key: "sizes" as const, label: "Sizes", count: catalog.sizes?.length || 0 },
          ]).map((t) => (
            <button key={t.key} onClick={() => { 
                setMgmtTab(t.key); 
                setShowAdd(false);
                router.replace(`/manager/settings/catalog?tab=${t.key}`, { scroll: false });
              }}
              className={`py-3 rounded-xl font-semibold text-sm transition ${
                mgmtTab === t.key
                  ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg"
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
            <button onClick={() => { setShowAdd(true); setAddStep(0); setSelCat(null); setSelThick(null); setSelectedSizes([]); }}
              className="w-full mb-4 py-3.5 rounded-xl bg-blue-600/20 border-2 border-dashed border-blue-500/40 text-blue-400 font-semibold flex items-center justify-center gap-2 hover:bg-blue-600/30 active:scale-[0.98] transition">
              <Plus size={20} /> Add Product
            </button>

            {showAdd && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-blue-300 font-semibold text-sm">
                    {addStep === 0 ? "➊ Select Category" : addStep === 1 ? "➋ Select Thickness" : "➌ Select Size(s)"}
                  </p>
                  <button onClick={() => setShowAdd(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
                </div>

                {addStep === 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {catalog.categories?.map((c: any) => (
                      <button key={c.id} onClick={() => { setSelCat(c); setAddStep(1); }}
                        className="py-4 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95]">{c.name}</button>
                    ))}
                    {(!catalog.categories || catalog.categories.length === 0) && (
                      <p className="col-span-3 text-slate-500 text-center py-4">No categories yet. Add categories in the &quot;Categories&quot; tab first.</p>
                    )}
                  </div>
                )}

                {addStep === 1 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Category: <span className="text-white">{selCat?.name}</span></p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {catalog.thicknesses?.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelThick(t); setAddStep(2); }}
                          className="py-3 bg-slate-700 hover:bg-blue-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
                          {t.value}<span className="text-xs opacity-60">mm</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setAddStep(0)} className="mt-2 text-sm text-slate-400">← Back</button>
                  </div>
                )}

                {addStep === 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">{selCat?.name} • <span className="text-white font-bold">{selThick?.value}mm</span></p>
                      {(() => {
                        const base8x4 = getProductCostAndBOM(selCat?.id, selThick?.id, { length: 8, width: 4 });
                        return base8x4.hasBOM ? (
                          <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            Base 8x4 Standard Cost: ₹{base8x4.mfgCostPerSheet.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            No BOM set (Add in Thicknesses tab)
                          </span>
                        );
                      })()}
                    </div>

                    {(() => {
                      const base8x4 = getProductCostAndBOM(selCat?.id, selThick?.id, { length: 8, width: 4 });
                      if (base8x4.hasBOM) {
                        return (
                          <div className="mb-3 p-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-xs">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block mb-1">
                              Base 8x4 Bill of Materials (BOM):
                            </span>
                            <p className="text-cyan-300 font-semibold text-[11px]">{base8x4.bomDescription}</p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <p className="text-xs text-slate-500 mb-2">Tap sizes to select. Standard cost scales automatically by size.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {catalog.sizes?.map((s: any) => {
                        const exists = products.some((p) => p.categoryId === selCat.id && p.thicknessId === selThick.id && p.sizeId === s.id && p.isActive);
                        const isSelected = selectedSizes.includes(s.id);
                        const costInfo = getProductCostAndBOM(selCat?.id, selThick?.id, s);
                        return (
                          <button key={s.id} onClick={() => {
                              if (exists) return;
                              setSelectedSizes(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                            }}
                            disabled={exists}
                            className={`p-3 rounded-xl font-bold transition active:scale-[0.95] border-2 text-left flex flex-col justify-between ${
                              exists ? "bg-blue-900/30 text-blue-500/50 cursor-not-allowed border-transparent" : 
                              isSelected ? "bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-slate-700/70 hover:bg-slate-600 text-white border-transparent"
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black">{s.label}</span>
                              {exists ? <span className="text-xs text-blue-400 font-bold">✓ Added</span> : isSelected && <span className="text-xs text-blue-300">Selected</span>}
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-600/40 text-[11px]">
                              {costInfo.hasBOM ? (
                                <span className="text-emerald-400 font-bold">₹{costInfo.mfgCostPerSheet.toFixed(2)}</span>
                              ) : (
                                <span className="text-slate-400">No BOM</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button onClick={() => { setAddStep(1); setSelectedSizes([]); }} className="text-sm text-slate-400 hover:text-white">← Back</button>
                      {selectedSizes.length > 0 && (
                        <button onClick={addSelectedProducts} className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 active:scale-[0.98]">
                          Add {selectedSizes.length} Product{selectedSizes.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No products configured. Add your first product above.</p>
                <p className="text-slate-500 text-sm mt-2">First add categories, thicknesses, and sizes in their respective tabs.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([catName, thicknesses]) => (
                  <div key={catName}>
                    <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                      <Layers size={18} className="text-blue-400" /> {catName}
                    </h2>
                    {Object.entries(thicknesses).map(([thickLabel, prods]) => (
                      <div key={thickLabel} className="mb-4">
                        <p className="text-slate-400 text-sm font-semibold mb-2 ml-1">{thickLabel}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {prods.map((p: any) => {
                            const costInfo = getProductCostAndBOM(p.categoryId, p.thicknessId, p.size);
                            return (
                              <div key={p.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative group hover:border-slate-700 transition">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h3 className="text-white font-black text-base">{p.size?.label}</h3>
                                    <span className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded-md">
                                      Stock: {p.currentStock}
                                    </span>
                                  </div>

                                  {/* BOM Description */}
                                  <div className="my-2.5 p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400/80 block mb-1">
                                      Bill of Materials (BOM)
                                    </span>
                                    <p className="text-slate-300 text-xs leading-relaxed font-medium">
                                      {costInfo.hasBOM ? costInfo.bomDescription : "No BOM configured"}
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                      Standardized Cost
                                    </span>
                                    <p className="text-emerald-400 font-black text-sm">
                                      {costInfo.hasBOM ? (
                                        <>₹{costInfo.mfgCostPerSheet.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ sheet</span></>
                                      ) : (
                                        <span className="text-slate-500 text-xs font-normal">--</span>
                                      )}
                                    </p>
                                  </div>
                                  <button onClick={() => toggleProduct(p.id, p.isActive)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                    title="Delete product">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="New category name (e.g. Packing, Semi, Alternate)"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
              <button onClick={() => addCatalogItem("category")} className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catalog.categories?.map((c: any) => (
                <div key={c.id} className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-4 flex justify-between items-center group">
                  <p className="text-white font-bold text-lg">{c.name}</p>
                  <button 
                    onClick={() => deleteCatalogItem(c.id, "category")}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {(!catalog.categories || catalog.categories.length === 0) && (
              <p className="text-slate-500 text-center py-8">No categories yet. Add your product categories above (e.g. Packing, Semi, Alternate).</p>
            )}
          </div>
        )}

        {/* ===================== THICKNESSES TAB ===================== */}
        {mgmtTab === "thicknesses" && (
          <div>
            <div className="flex gap-2 mb-6 items-center">
              <input type="number" value={newThickVal} onChange={(e) => setNewThickVal(e.target.value)} placeholder="e.g. 19"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
              <span className="text-slate-400">mm</span>
              <button onClick={() => addCatalogItem("thickness")} className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-white font-bold text-lg">Production Press Timings</h2>
                  <p className="text-slate-500 text-sm">Set specific cooking & cooling times for each category and thickness.</p>
                </div>
                
                <div className="flex gap-1 bg-slate-800 p-1.5 rounded-2xl">
                   {catalog.categories?.map((c: any) => (
                     <button
                        key={c.id}
                        onClick={() => setSelTimingCat(c)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selTimingCat?.id === c.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                     >
                       {c.name}
                     </button>
                   ))}
                </div>
              </div>

              {selTimingCat && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">{selTimingCat.name} CATEGORY PARAMETERS</span>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {catalog.thicknesses?.map((t: any) => {
                      const timingKey = `${selTimingCat.id}-${t.id}`;
                      const tt = timingMap[timingKey] || { cookingTime: "0", coolingTime: "0", ratePerSqft: "0", saving: false, saved: false };
                      const totalMin = (parseFloat(tt.cookingTime) || 0) + (parseFloat(tt.coolingTime) || 0);

                      const specKey = `${selTimingCat.id}-${t.id}`;
                      const sp = specMap[specKey] || { weightPerSheetKg: "", longCore: "", glueCore: "", saving: false, saved: false, bomItems: [] };
                      const lcNum = parseInt(sp.longCore, 10) || 0;
                      const gcNum = parseInt(sp.glueCore, 10) || 0;
                      const totalPliesCalculated = lcNum + gcNum;

                      return (
                        <div key={t.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
                          <div>
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-white">{t.value}</span>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t.unit || "mm"}</span>
                                <button 
                                  onClick={() => deleteCatalogItem(t.id, "thickness")}
                                  className="ml-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  title="Delete Thickness"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {totalPliesCalculated > 0 && (
                                  <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-lg text-[11px] font-bold">
                                    {totalPliesCalculated} Plies
                                  </span>
                                )}
                                <span className="px-2.5 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-[11px] font-bold">
                                  {totalMin}m Cycle
                                </span>
                              </div>
                            </div>

                            {/* Section 1: Press Timings & Rate */}
                            <div className="mb-5">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Press Timings & Rate</p>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-2.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <span className="text-orange-400">🔥</span> Cook (m)
                                  </label>
                                  <input
                                    type="number" min={0} step={1} value={tt.cookingTime}
                                    onChange={(e) => setTimingMap((prev) => ({ ...prev, [timingKey]: { ...prev[timingKey], cookingTime: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-black text-center text-sm focus:border-orange-500/50 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <span className="text-blue-400">❄️</span> Cool (m)
                                  </label>
                                  <input
                                    type="number" min={0} step={1} value={tt.coolingTime}
                                    onChange={(e) => setTimingMap((prev) => ({ ...prev, [timingKey]: { ...prev[timingKey], coolingTime: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-black text-center text-sm focus:border-blue-500/50 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <span className="text-emerald-400">₹</span> Rate/SqFt
                                  </label>
                                  <input
                                    type="number" min={0} step={0.1} value={tt.ratePerSqft}
                                    onChange={(e) => setTimingMap((prev) => ({ ...prev, [timingKey]: { ...prev[timingKey], ratePerSqft: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-emerald-900/30 rounded-xl px-2 py-1.5 text-emerald-400 font-black text-center text-sm focus:border-emerald-500/50 outline-none transition-all"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => updateProductTiming(t.id)}
                                disabled={tt.saving}
                                className={`w-full py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
                                  tt.saved 
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                    : "bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/20"
                                }`}
                              >
                                {tt.saving ? "Saving..." : tt.saved ? "Timings Saved ✓" : "Save Timings"}
                              </button>
                            </div>

                            {/* Section 2: Plywood Specifications & Core Details */}
                            <div className="pt-3 border-t border-slate-750/50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                  <Layers size={11} /> Specifications & Cores
                                </p>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-2.5">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    Avg Wt (KG)
                                  </label>
                                  <input
                                    type="number" step="0.1" placeholder="e.g. 27" value={sp.weightPerSheetKg}
                                    onChange={(e) => setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], weightPerSheetKg: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-black text-center text-sm focus:border-cyan-500/50 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    Glue Core
                                  </label>
                                  <input
                                    type="number" min={0} step={1} placeholder="e.g. 7" value={sp.glueCore}
                                    onChange={(e) => setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], glueCore: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-black text-center text-sm focus:border-cyan-500/50 outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    Long Core
                                  </label>
                                  <input
                                    type="number" min={0} step={1} placeholder="e.g. 8" value={sp.longCore}
                                    onChange={(e) => setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], longCore: e.target.value, saved: false } }))}
                                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-black text-center text-sm focus:border-cyan-500/50 outline-none transition-all"
                                  />
                                </div>
                              </div>

                              {/* Live calculation banner */}
                              {/* <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-2 mb-2.5 flex items-center justify-between text-xs">
                                <span className="text-slate-400 text-[11px]">
                                  Total Plies ({lcNum || 0} LC + {gcNum || 0} GC):
                                </span>
                                <span className="font-extrabold text-cyan-300">
                                  {totalPliesCalculated > 0 ? `${totalPliesCalculated} Plies` : "--"}
                                </span>
                              </div> */}

                              {/* Bill of Materials Builder */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                    <Package size={11} /> Bill of Materials
                                  </label>
                                  <button
                                    onClick={() => {
                                      setSpecMap((prev) => ({
                                        ...prev,
                                        [specKey]: {
                                          ...prev[specKey],
                                          bomItems: [...(prev[specKey]?.bomItems || []), { materialId: "", quantity: "" }],
                                          saved: false
                                        }
                                      }));
                                    }}
                                    className="text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold uppercase"
                                  >
                                    <Plus size={10} /> Add Item
                                  </button>
                                </div>
                                
                                {sp.bomItems?.length === 0 && (
                                  <div className="text-center py-2 bg-slate-900/40 rounded-lg border border-slate-800 border-dashed">
                                    <p className="text-[10px] text-slate-500">No raw materials added.</p>
                                  </div>
                                )}
                                
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                  {sp.bomItems?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                      <select
                                        value={item.materialId}
                                        onChange={(e) => {
                                          const newBom = [...(sp.bomItems || [])];
                                          newBom[idx] = { ...newBom[idx], materialId: e.target.value };
                                          setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], bomItems: newBom, saved: false } }));
                                        }}
                                        className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:border-cyan-500/50 outline-none"
                                      >
                                        <option value="">Select Material...</option>
                                        {catalog.rawMaterials?.map((rm: any) => (
                                          <option key={rm.id} value={rm.id}>
                                            {rm.name} {rm.unit ? `(${rm.unit})` : ""}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newBom = [...(sp.bomItems || [])];
                                          newBom[idx] = { ...newBom[idx], quantity: e.target.value };
                                          setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], bomItems: newBom, saved: false } }));
                                        }}
                                        className="w-20 bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1 text-white text-center text-xs focus:border-cyan-500/50 outline-none"
                                      />
                                      <button
                                        onClick={() => {
                                          const newBom = (sp.bomItems || []).filter((_: any, i: number) => i !== idx);
                                          setSpecMap((prev) => ({ ...prev, [specKey]: { ...prev[specKey], bomItems: newBom, saved: false } }));
                                        }}
                                        className="p-1 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-400/10 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={() => updateProductSpec(t.id)}
                                disabled={sp.saving}
                                className={`w-full py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
                                  sp.saved 
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                    : "bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30"
                                }`}
                              >
                                {sp.saving ? "Saving Specs..." : sp.saved ? "Specs Saved ✓" : "Save Specs"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!catalog.categories || catalog.categories.length === 0) && (
                 <div className="text-center py-12">
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Categories Defined</p>
                   <p className="text-slate-600 text-sm mt-1">Add product types first to configure press timings.</p>
                 </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== SIZES TAB ===================== */}
        {mgmtTab === "sizes" && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              <input type="number" step="0.25" value={newSizeLength} onChange={(e) => setNewSizeLength(e.target.value)} placeholder="Length"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
              <span className="text-slate-400 text-2xl">×</span>
              <input type="number" step="0.25" value={newSizeWidth} onChange={(e) => setNewSizeWidth(e.target.value)} placeholder="Width"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
              <input type="number" step="0.1" value={newSizeSqft} onChange={(e) => setNewSizeSqft(e.target.value)} placeholder="Sq.Ft (e.g 32)"
                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <button onClick={() => addCatalogItem("size")} className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-xl active:scale-[0.97]">Add</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {catalog.sizes?.map((s: any) => (
                <div key={s.id} className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4 text-center relative group">
                  <button 
                    onClick={() => deleteCatalogItem(s.id, "size")}
                    className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Size"
                  >
                    <Trash2 size={14} />
                  </button>
                  <p className="text-2xl font-black text-white">{s.label}</p>
                  <p className="text-slate-400 text-xs">{s.length}ft × {s.width}ft</p>
                  <p className="text-emerald-400 font-bold text-xs mt-1 border-t border-slate-700/50 pt-1">{s.sqft} Sq.Ft</p>
                </div>
              ))}
            </div>
            {(!catalog.sizes || catalog.sizes.length === 0) && (
              <p className="text-slate-500 text-center py-8">No sizes yet. Add the sizes your company produces (e.g. 8×4, 7×3).</p>
            )}
          </div>
        )}
    </div>
  );
}
