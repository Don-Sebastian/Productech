"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Package, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { sortProducts } from "@/lib/sorting";

interface Product {
  id: string;
  openingStock: number;
  currentStock: number;
  isActive: boolean;
  category: { id: string; name: string; sortOrder?: number };
  thickness: { id: string; value: number };
  size: { id: string; label: string; length: number; width: number };
}

export default function OwnerInventory() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/company-products").then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) setProducts(d.filter((p: Product) => p.isActive));
        setLoading(false);
      });
    }
  }, [status]);

  const categories = [...new Set(products.map((p) => p.category?.name))].filter(Boolean);

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filtered = filter === "All" ? products : products.filter((p) => p.category?.name === filter);
  const sorted = sortProducts(filtered);

  const grouped: Record<string, Product[]> = {};
  sorted.forEach((p) => {
    const cat = p.category?.name || "Unknown";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const groupByThickness = (items: Product[]): Record<string, Product[]> => {
    const g: Record<string, Product[]> = {};
    items.forEach((p) => {
      const key = `${p.thickness?.value}mm`;
      if (!g[key]) g[key] = [];
      g[key].push(p);
    });
    return g;
  };

  const totalStock = products.reduce((s, p) => s + p.currentStock, 0);
  const lowStockCount = products.filter((p) => p.currentStock < 50).length;

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Package size={22} /> Stock Overview</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Current stock across all products</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 md:p-5 text-center">
            <p className="text-lg md:text-3xl font-bold text-white">{products.length}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Products</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 md:p-5 text-center">
            <p className="text-lg md:text-3xl font-bold text-emerald-400">{totalStock}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Total Stock</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 md:p-5 text-center">
            <p className={`text-lg md:text-3xl font-bold ${lowStockCount > 0 ? "text-red-400" : "text-emerald-400"}`}>{lowStockCount}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Low Stock</p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {["All", ...categories].map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition ${
                filter === c ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}>{c}</button>
          ))}
        </div>

        {/* Product Groups */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([catName, items]) => (
              <div key={catName} className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
                <button onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Package size={16} className="text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm md:text-base">{catName}</p>
                      <p className="text-slate-500 text-[10px] md:text-xs">{items.length} products</p>
                    </div>
                  </div>
                  {expandedCats.has(catName) ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {expandedCats.has(catName) && (
                  <div className="max-h-[60vh] overflow-y-auto px-2 pb-3 md:px-4 md:pb-4">
                    {Object.entries(groupByThickness(items)).map(([thickLabel, sizeItems]) => (
                      <div key={thickLabel} className="mb-3 last:mb-0">
                        <p className="text-emerald-300 font-bold text-xs md:text-sm mb-2 px-1 sticky top-0 bg-slate-950/90 py-1 z-10 backdrop-blur-sm">{thickLabel}</p>
                        
                        {/* Card layout for all screens */}
                        <div className="space-y-1.5">
                          {sizeItems.map((p) => (
                            <div key={p.id} className="bg-slate-900/50 border border-slate-700/20 rounded-lg px-3 py-2 flex items-center justify-between">
                              <span className="text-white font-bold text-sm min-w-[32px]">{p.size?.label}</span>
                              <span className={`font-bold text-sm ${
                                p.currentStock === 0 ? "text-slate-600" :
                                p.currentStock < 50 ? "text-red-400" :
                                p.currentStock < 100 ? "text-amber-400" : "text-emerald-400"
                              }`}>
                                {p.currentStock} <span className="text-[10px] font-normal text-slate-500">sheets</span>
                                {p.currentStock < 50 && p.currentStock > 0 && <AlertTriangle size={10} className="inline ml-1 text-red-400" />}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
