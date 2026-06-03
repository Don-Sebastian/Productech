"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function StockTransferPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const sourceCompanyId = (session?.user as any)?.companyId;
  const ownedCompanies = (session?.user as any)?.ownedCompanies || [];
  
  const targetCompanies = ownedCompanies.filter((c: any) => c.id !== sourceCompanyId);

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", sourceCompanyId],
    queryFn: () => fetch("/api/inventory").then((res) => {
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    }),
    enabled: !!sourceCompanyId,
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transfer failed");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("Stock transferred successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setQuantity("");
      setNotes("");
    },
    onError: (error: any) => {
      alert(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompanyId || !productTypeId || !quantity) {
      alert("Please fill all required fields");
      return;
    }
    const selectedItem = inventory?.find((item: any) => item.productType.id === productTypeId);
    if (selectedItem && parseInt(quantity) > selectedItem.quantity) {
      alert("Transfer quantity exceeds available stock");
      return;
    }

    transferMutation.mutate({
      sourceCompanyId,
      targetCompanyId,
      productTypeId,
      quantity: parseInt(quantity),
      notes,
    });
  };

  const selectedProduct = inventory?.find((item: any) => item.productType.id === productTypeId);

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Truck className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Stock Transfer</h1>
          <p className="text-sm text-slate-400">Move inventory between your companies safely</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Source */}
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold text-slate-500 mb-2 block">Source Company</label>
                <div className="bg-slate-900/50 border border-slate-700/50 text-slate-400 text-sm rounded-xl px-4 py-3">
                  {ownedCompanies.find((c: any) => c.id === sourceCompanyId)?.name || "Loading..."}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-300 mb-2 block">Product to Transfer *</label>
                <select
                  value={productTypeId}
                  onChange={(e) => setProductTypeId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="">Select a product...</option>
                  {inventory?.filter((item: any) => item.quantity > 0).map((item: any) => (
                    <option key={item.productType.id} value={item.productType.id}>
                      {item.productType.name} ({item.productType.thickness}mm) - {item.quantity} available
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Available to transfer: {selectedProduct.quantity}
                  </p>
                )}
              </div>
            </div>

            {/* Target */}
            <div className="space-y-4 relative">
              <div className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 -ml-2 text-slate-600 bg-slate-800 p-2 rounded-full border border-slate-700 z-20">
                <ArrowRight size={20} />
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-300 mb-2 block">Target Company *</label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="">Select destination...</option>
                  {targetCompanies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-slate-300 mb-2 block">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity || ""}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter quantity"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-slate-300 mb-2 block">Transfer Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Urgent stock rebalancing for big order"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={transferMutation.isPending || !targetCompanyId || !productTypeId || !quantity}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {transferMutation.isPending ? "Transferring..." : "Execute Transfer"}
              <Truck size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-900/20 border border-blue-900/50 rounded-xl p-4 flex gap-3 text-blue-300/80">
        <AlertCircle size={20} className="shrink-0 text-blue-400" />
        <p className="text-sm leading-relaxed">
          Transfers are instantaneous and will adjust stock levels in both the active company and the target company immediately. Appropriate OUTBOUND and INBOUND logs will be generated automatically.
        </p>
      </div>
    </div>
  );
}
