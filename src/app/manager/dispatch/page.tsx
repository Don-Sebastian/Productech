"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Truck, Check, Package, X, Clock, AlertTriangle, IndianRupee, DollarSign, Layers } from "lucide-react";

function ManagerDispatchContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Confirmation & Pricing Modal State
  const [confirmingLoad, setConfirmingLoad] = useState<any | null>(null);
  const [thicknessPrices, setThicknessPrices] = useState<{ [thicknessVal: string]: string }>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const { data: apiData, isLoading: loading, refetch: fetchLoads } = useQuery({
    queryKey: ["manager-dispatch"],
    queryFn: async () => {
      const res = await fetch("/api/dispatch");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const dispatchLoads = useMemo(() => Array.isArray(apiData) ? apiData : [], [apiData]);

  const [stockShortages, setStockShortages] = useState<any[] | null>(null);

  const deleteLoad = async (id: string) => {
    if (!window.confirm("Are you sure you want to completely delete this dispatch load? Any affected inventory will be restored.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/dispatch/${id}`, { method: "DELETE" });
      if (res.ok) fetchLoads();
    } catch (error) {
      console.error("Failed to delete load", error);
    }
    setActionLoading(null);
  };

  const startEdit = (load: any) => {
    setEditingLoadId(load.id);
    const data: any = {};
    load.items?.forEach((i: any) => data[i.id] = { quantity: String(i.quantity), salePricePerSqft: i.salePricePerSqft ? String(i.salePricePerSqft) : "" });
    setEditData(data);
  };

  const saveEdit = async (loadId: string) => {
    setActionLoading(loadId);
    try {
      const itemsPayload = Object.keys(editData).map((id) => ({ 
        id, 
        quantity: editData[id].quantity,
        salePricePerSqft: editData[id].salePricePerSqft 
      }));
      const res = await fetch(`/api/dispatch/${loadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
      if (res.ok) {
        setEditingLoadId(null);
        fetchLoads();
      }
    } catch { }
    setActionLoading(null);
  };

  // Open Confirm & Pricing Modal
  const openConfirmModal = (load: any) => {
    const initialPrices: { [thicknessVal: string]: string } = {};
    load.items?.forEach((item: any) => {
      const val = String(item.thickness?.value || "");
      if (val && item.salePricePerSqft && !initialPrices[val]) {
        initialPrices[val] = String(item.salePricePerSqft);
      }
    });
    setThicknessPrices(initialPrices);
    setConfirmingLoad(load);
  };

  // Submit Final Dispatch with Prices
  const handleFinalDispatch = async () => {
    if (!confirmingLoad) return;
    setActionLoading(confirmingLoad.id);
    try {
      const itemsPayload = confirmingLoad.items.map((item: any) => {
        const thicknessVal = String(item.thickness?.value || "");
        const priceStr = thicknessPrices[thicknessVal];
        return {
          id: item.id,
          quantity: item.quantity,
          salePricePerSqft: priceStr ? parseFloat(priceStr) : null
        };
      });

      const res = await fetch(`/api/dispatch/${confirmingLoad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DISPATCHED",
          items: itemsPayload
        }),
      });

      if (res.ok) {
        setConfirmingLoad(null);
        fetchLoads();
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.error === "INSUFFICIENT_STOCK" && data.shortages) {
          setConfirmingLoad(null);
          setStockShortages(data.shortages);
        }
      }
    } catch (error) {
      console.error("Failed to dispatch load", error);
    }
    setActionLoading(null);
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>;
  }

  const pendingConfirmation = dispatchLoads.filter(l => l.status === "SUPERVISOR_SUBMITTED" || l.status === "MANAGER_CONFIRMED");
  const completed = dispatchLoads.filter(l => l.status === "DISPATCHED");

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Truck size={28} className="text-teal-400" /> Dispatch Approvals
          </h1>
          <p className="text-slate-400 text-sm mt-1">Review supervisor-submitted dispatch loads, set sale prices, and deduct inventory directly.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>
        ) : (
          <div className="space-y-6">

            {/* Waiting Confirmation / Dispatch */}
            {pendingConfirmation.length > 0 && (
              <div>
                <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} /> WAITING YOUR APPROVAL & DISPATCH ({pendingConfirmation.length})
                </h2>
                <div className="space-y-3">
                  {pendingConfirmation.map(load => renderLoad(load, true))}
                </div>
              </div>
            )}

            {/* Completed Dispatches */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Check size={16} /> DISPATCHED & INVENTORY DEDUCTED ({completed.length})
                </h2>
                <div className="space-y-3 opacity-80">
                  {completed.map(load => renderLoad(load, false))}
                </div>
              </div>
            )}

            {dispatchLoads.length === 0 && (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">No dispatch loads found.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation & Sale Price Modal */}
      {confirmingLoad && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-white font-black text-xl">Confirm & Dispatch Order</h2>
                  <p className="text-slate-400 text-xs">Enter the sale price per sqft for each thickness to calculate revenue and deduct inventory.</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmingLoad(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Order Details Header */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Customer</p>
                <p className="text-white font-bold text-sm">{confirmingLoad.order?.customer?.name || "Private Dispatch"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Order Number</p>
                <p className="text-teal-400 font-bold text-sm">{confirmingLoad.order?.orderNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Load ID</p>
                <p className="text-slate-300 font-bold text-sm">{confirmingLoad.loadNumber}</p>
              </div>
            </div>

            {/* Items Listing */}
            <div className="mb-5">
              <h3 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package size={14} className="text-teal-400" /> Dispatch Order Items
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/80 text-slate-400">
                    <tr>
                      <th className="p-2.5 pl-3">Product</th>
                      <th className="p-2.5 text-center">Thickness</th>
                      <th className="p-2.5 text-right">Dispatch Qty</th>
                      <th className="p-2.5 text-right pr-3">Total Sqft</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {confirmingLoad.items?.map((item: any, idx: number) => {
                      const itemSqft = (item.size?.sqft || (item.size?.length * item.size?.width / 929.0304) || 32) * item.quantity;
                      return (
                        <tr key={idx} className="bg-slate-950/50">
                          <td className="p-2.5 pl-3 text-white font-medium">
                            {item.category?.name} • {item.size?.label}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 font-bold rounded">
                              {item.thickness?.value}mm
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">{item.quantity}</td>
                          <td className="p-2.5 text-right pr-3 text-slate-400">{itemSqft.toFixed(1)} sqft</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sale Price per sqft per Thickness */}
            <div className="mb-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/30 rounded-2xl p-5 shadow-lg">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <IndianRupee size={16} className="text-teal-400" /> Set Sale Price Per Sqft (By Thickness)
              </h3>
              
              {/* Distinct Thickness inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from(new Set(confirmingLoad.items?.map((i: any) => String(i.thickness?.value)))).filter(Boolean).map((tVal: any) => (
                  <div key={tVal} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <label className="text-xs text-slate-400 font-bold block mb-1.5 flex items-center justify-between">
                      <span>{tVal}mm Plywood</span>
                      <span className="text-[10px] text-teal-400 font-normal">₹ / sqft</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 55.00"
                        value={thicknessPrices[tVal] || ""}
                        onChange={(e) => setThicknessPrices({ ...thicknessPrices, [tVal]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-bold outline-none focus:border-teal-400 transition"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Estimated Revenue Calculation */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Total Estimated Revenue</p>
                  <p className="text-[10px] text-slate-500">Calculated across all items in this dispatch</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-400">
                    ₹{confirmingLoad.items?.reduce((acc: number, item: any) => {
                      const tVal = String(item.thickness?.value || "");
                      const price = parseFloat(thicknessPrices[tVal]) || 0;
                      const itemSqft = (item.size?.sqft || (item.size?.length * item.size?.width / 929.0304) || 32) * item.quantity;
                      return acc + (itemSqft * price);
                    }, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingLoad(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalDispatch}
                disabled={actionLoading === confirmingLoad.id}
                className="flex-2 py-3 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-teal-900/30 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Truck size={18} /> {actionLoading === confirmingLoad.id ? "Processing..." : "Confirm & Dispatch Load"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Shortage Modal */}
      {stockShortages && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-black text-lg">Insufficient Stock</h3>
                <p className="text-slate-400 text-xs">Cannot dispatch — the following items exceed available inventory.</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {stockShortages.map((s: any, idx: number) => (
                <div key={idx} className="bg-red-950/40 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{s.product}</span>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-sm">Need {s.requested}</p>
                    <p className="text-slate-500 text-[10px]">In stock: {s.currentStock}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setStockShortages(null); router.push("/manager/inventory"); }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition active:scale-[0.97]"
              >
                Go to Inventory
              </button>
              <button
                onClick={() => setStockShortages(null)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderLoad(load: any, isPending: boolean) {
    const isUpdating = actionLoading === load.id;
    return (
      <div key={load.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-white font-black text-xl tracking-tight">
                {load.order?.customer?.name || "Private Dispatch"}
              </h3>
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                ID: {load.loadNumber}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${load.status === "SUPERVISOR_SUBMITTED" ? "bg-amber-500/20 text-amber-300" :
                  load.status === "MANAGER_CONFIRMED" ? "bg-blue-500/20 text-blue-300" :
                    "bg-emerald-500/20 text-emerald-300"
                }`}>{load.status.replace("_", " ")}</span>
            </div>
            <p className="text-slate-400 text-sm mb-2 mt-2">
              <span className="text-slate-300 font-bold">Order: {load.order?.orderNumber}</span>
              <span className="mx-2 text-slate-600">•</span>
              <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20 uppercase tracking-widest font-black text-[10px]">
                {load.order?.customer?.name}
              </span>
              <br />
              <span className="text-[10px] mt-1 block text-slate-500 font-bold tracking-tight">Created by: {load.createdBy?.name} on {new Date(load.createdAt).toLocaleString()}</span>
            </p>

            <div className="mt-4 bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden text-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-800/80 text-slate-400 text-xs">
                  <tr>
                    <th className="p-2 pl-3">Product</th>
                    <th className="p-2 text-right">Ordered Qty</th>
                    <th className="p-2 text-right">Sale Price/sqft</th>
                    <th className="p-2 text-right pr-3">Dispatching Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {load.items?.map((item: any, idx: number) => {
                    const matchOrder = load.order?.items?.find((oi: any) =>
                      oi.category.name === item.category?.name &&
                      oi.thickness.value === item.thickness?.value &&
                      oi.size.label === item.size?.label
                    );
                    const orderedQty = matchOrder ? matchOrder.quantity : 0;

                    return (
                      <tr key={idx} className="bg-slate-900/40">
                        <td className="p-2 pl-3 text-white font-medium text-xs sm:text-sm">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</td>
                        <td className="p-2 text-right font-bold text-slate-500">{orderedQty || "-"}</td>
                        <td className="p-2 text-right">
                          {editingLoadId === load.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-500 text-xs">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-16 px-2 py-1 bg-slate-950 border border-slate-600 rounded text-cyan-400 font-bold outline-none focus:border-cyan-500 text-right"
                                value={editData[item.id]?.salePricePerSqft || ""}
                                onChange={(e) => setEditData({ ...editData, [item.id]: { ...editData[item.id], salePricePerSqft: e.target.value } })}
                              />
                            </div>
                          ) : (
                            <span className="font-medium text-cyan-400">
                              {item.salePricePerSqft ? `₹${item.salePricePerSqft}` : "-"}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right pr-3">
                          {editingLoadId === load.id ? (
                            <input
                              type="number"
                              className="w-16 px-2 py-1 bg-slate-950 border border-slate-600 rounded text-emerald-400 font-bold outline-none focus:border-emerald-500 text-right"
                              value={editData[item.id]?.quantity || item.quantity}
                              onChange={(e) => setEditData({ ...editData, [item.id]: { ...editData[item.id], quantity: e.target.value } })}
                            />
                          ) : (
                            <span className={`font-bold ${item.quantity < orderedQty ? "text-amber-400" : "text-emerald-400"}`}>
                              {item.quantity}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {load.notes && (
              <p className="mt-3 text-sm text-amber-200/80 bg-amber-500/10 p-2 rounded-lg italic">Notes: {load.notes}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-[170px]">
            {editingLoadId === load.id ? (
              <>
                <button
                  onClick={() => saveEdit(load.id)}
                  disabled={isUpdating}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition"
                >
                  {isUpdating ? "..." : "Save List"}
                </button>
                <button
                  onClick={() => setEditingLoadId(null)}
                  disabled={isUpdating}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl disabled:opacity-50 transition"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {isPending && (
                  <button
                    onClick={() => openConfirmModal(load)}
                    disabled={isUpdating}
                    className="w-full py-2.5 px-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                  >
                    <Truck size={16} /> Confirm & Dispatch
                  </button>
                )}

                {isPending && (
                  <>
                    <button onClick={() => startEdit(load)} disabled={isUpdating} className="w-full py-2 border border-slate-600 text-slate-300 hover:text-white rounded-xl text-sm transition mt-1">
                      ✎ Edit List
                    </button>
                    <button onClick={() => deleteLoad(load.id)} disabled={isUpdating} className="w-full py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-sm transition mt-2">
                      🗑 Delete Load
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default function ManagerDispatchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>}>
      <ManagerDispatchContent />
    </Suspense>
  );
}
