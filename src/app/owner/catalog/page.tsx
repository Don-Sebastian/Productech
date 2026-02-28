"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Package, Layers, Info } from "lucide-react";

export default function OwnerCatalogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [catalog, setCatalog] = useState<any>({ categories: [], thicknesses: [], sizes: [] });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/catalog").then((r) => r.json()),
        fetch("/api/company-products").then((r) => r.json()),
      ]).then(([c, p]) => {
        setCatalog(c);
        if (Array.isArray(p)) setProducts(p);
        setLoading(false);
      });
    }
  }, [status]);

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

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Product Catalog</h1>
          <p className="text-slate-400 text-sm">View products configured by your manager</p>
        </div>

        <div className="mb-6 bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 flex items-start gap-3">
          <Info size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-300 font-semibold text-sm">Catalog management has moved to Manager</p>
            <p className="text-slate-400 text-xs mt-1">Managers now create and manage the product catalog (types, thicknesses, sizes, and product combinations). You can view the catalog here.</p>
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
                  <div key={thickLabel} className="mb-3">
                    <p className="text-slate-400 text-sm font-semibold mb-2 ml-1">{thickLabel}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {prods.map((p: any) => (
                        <div key={p.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 text-center">
                          <p className="text-white font-bold text-sm">{p.size?.label}</p>
                          <p className="text-slate-500 text-xs mt-1">Stock: {p.currentStock}</p>
                        </div>
                      ))}
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
