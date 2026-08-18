"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Package, Layers, Info } from "lucide-react";

export default function OwnerCatalogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const { data: pageData, isLoading: loading } = useQuery({
    queryKey: ["owner-catalog"],
    queryFn: async () => {
      const [c, p, stdRates, budgetData] = await Promise.all([
        fetch("/api/catalog").then((r) => r.json()),
        fetch("/api/company-products").then((r) => r.json()),
        fetch("/api/settings/standard-rates").then((r) => r.json()),
        fetch("/api/settings/budget").then((r) => r.json()),
      ]);
      return { catalog: c, products: p, stdRates: Array.isArray(stdRates) ? stdRates : [], budget: budgetData || {} };
    },
    enabled: status === "authenticated",
  });

  const catalog = useMemo(() => pageData?.catalog || { categories: [], thicknesses: [], sizes: [], productSpecs: [] }, [pageData]);
  const products = useMemo(() => Array.isArray(pageData?.products) ? pageData.products : [], [pageData]);
  const stdRates = useMemo(() => pageData?.stdRates || [], [pageData]);
  const budget = useMemo(() => pageData?.budget || {}, [pageData]);

  // Calculate Standard Overhead per standard sheet (8x4 = 32 sqft)
  const budgetOverheadPerSheet = useMemo(() => {
    if (!budget.targetSheets || budget.targetSheets <= 0) return 0;
    return (budget.monthlyOverhead || 0) / budget.targetSheets;
  }, [budget]);

  // Helper to get standard rate for a material (from standardRates config or rawMaterial.currentRate)
  const getStdRate = (materialId: string) => {
    const rate = stdRates.find((r: any) => r.materialId === materialId);
    if (rate && rate.pricePerUnit > 0) return rate.pricePerUnit;
    const mat = catalog.rawMaterials?.find((m: any) => m.id === materialId);
    return mat?.currentRate || 0;
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>;
  }

  const activeProducts = products.filter(p => p.isActive);
  const grouped: Record<string, Record<string, any[]>> = {};
  activeProducts.forEach((p) => {
    const catName = p.category?.name || "Unknown";
    const thickLabel = `${p.thickness?.value}mm`;
    if (!grouped[catName]) grouped[catName] = {};
    if (!grouped[catName][thickLabel]) grouped[catName][thickLabel] = [];
    grouped[catName][thickLabel].push(p);
  });

  // Calculate Standard Mfg Cost & BOM summary based on 8x4 (32 sqft) scaling
  const getProductDetails = (categoryId: string, thicknessId: string, size: any) => {
    const spec = catalog.productSpecs?.find((s: any) => s.categoryId === categoryId && s.thicknessId === thicknessId);
    if (!spec || !spec.bomItems || spec.bomItems.length === 0) {
      return { hasBOM: false, bomDescription: "No BOM configured", mfgCost: "0.00" };
    }
    
    const sizeSqft = (size?.length && size?.width) ? (size.length * size.width) : (size?.sqft || 32);
    const scaleFactor = sizeSqft / 32;

    let base8x4MaterialCost = 0;
    const scaledItems: string[] = [];

    spec.bomItems.forEach((item: any) => {
      const mat = catalog.rawMaterials?.find((m: any) => m.id === item.materialId) || item.material;
      const rate = getStdRate(item.materialId);
      const baseQty = Number(item.quantity) || 0;
      const scaledQty = baseQty * scaleFactor;
      base8x4MaterialCost += (baseQty * rate);

      const matName = mat?.name || "Material";
      const unit = mat?.unit || "unit";
      scaledItems.push(`${matName}: ${scaledQty.toFixed(1)} ${unit}`);
    });
    
    const totalBaseCost = base8x4MaterialCost + budgetOverheadPerSheet;
    const costPerSqft = totalBaseCost / 32;
    const mfgCost = (costPerSqft * sizeSqft).toFixed(2);

    return {
      hasBOM: true,
      bomDescription: scaledItems.join(" • "),
      mfgCost,
    };
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Product Catalog</h1>
          <p className="text-slate-400 text-sm">View products, BOM configurations, and standardized manufacturing costs</p>
        </div>

        <div className="mb-6 bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 flex items-start gap-3">
          <Info size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-300 font-semibold text-sm">BOM Standard Costing Active</p>
            <p className="text-slate-400 text-xs mt-1">
              Standard costs are calculated from the manager&apos;s Bill of Materials (BOM) configured for 8x4 (32 sqft) sheets, scaled automatically to each product size.
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{catalog.categories?.length || 0}</p>
            <p className="text-xs text-slate-500">Categories</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{catalog.thicknesses?.length || 0}</p>
            <p className="text-xs text-slate-500">Thicknesses</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{activeProducts.length}</p>
            <p className="text-xs text-slate-500">Products</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No products configured yet</p>
            <p className="text-slate-500 text-sm mt-2">Ask your manager to set up the product catalog.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([catName, thicknesses]) => (
              <div key={catName}>
                <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" /> {catName}
                </h2>
                {Object.entries(thicknesses).map(([thickLabel, prods]) => (
                  <div key={thickLabel} className="mb-4">
                    <p className="text-slate-400 text-sm font-semibold mb-2 ml-1">{thickLabel}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {prods.map((p: any) => {
                        const details = getProductDetails(p.categoryId, p.thicknessId, p.size);
                        return (
                          <div key={p.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-white font-black text-base">{p.size?.label}</p>
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
                                  {details.hasBOM ? details.bomDescription : "No BOM configured"}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                  Standardized Cost
                                </span>
                                <p className="text-emerald-400 font-black text-sm">
                                  {details.hasBOM ? `₹${details.mfgCost} / sheet` : "--"}
                                </p>
                              </div>
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
      </main>
    </div>
  );
}

