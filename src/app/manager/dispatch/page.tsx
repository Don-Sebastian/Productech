"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { Truck, Check, Package, X, CheckSquare, Clock } from "lucide-react";

function ManagerDispatchContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [dispatchLoads, setDispatchLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const fetchLoads = () => {
    fetch("/api/dispatch")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setDispatchLoads(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "authenticated") fetchLoads();
  }, [status]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/dispatch/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchLoads();
    } catch (error) {
      console.error("Failed to update status", error);
    }
    setActionLoading(null);
  };

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
    load.items?.forEach((i: any) => data[i.id] = String(i.quantity));
    setEditData(data);
  };

  const saveEdit = async (loadId: string) => {
    setActionLoading(loadId);
    try {
      const itemsPayload = Object.keys(editData).map((id) => ({ id, quantity: editData[id] }));
      const res = await fetch(`/api/dispatch/${loadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });
      if (res.ok) {
        setEditingLoadId(null);
        fetchLoads();
      }
    } catch {}
    setActionLoading(null);
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>;
  }

  const pendingConfirmation = dispatchLoads.filter(l => l.status === "SUPERVISOR_SUBMITTED");
  const confirmed = dispatchLoads.filter(l => l.status === "MANAGER_CONFIRMED");
  const completed = dispatchLoads.filter(l => l.status === "DISPATCHED");

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Truck size={28} className="text-teal-400" /> Dispatch Approvals
          </h1>
          <p className="text-slate-400 text-sm mt-1">Review supervisor-submitted dispatch loads and deduct inventory</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>
        ) : (
          <div className="space-y-6">
            
            {/* Needs Confirmation */}
            {pendingConfirmation.length > 0 && (
              <div>
                <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} /> WAITING YOUR CONFIRMATION ({pendingConfirmation.length})
                </h2>
                <div className="space-y-3">
                  {pendingConfirmation.map(load => renderLoad(load, true))}
                </div>
              </div>
            )}

            {/* Confirmed - Waiting dispatch */}
            {confirmed.length > 0 && (
              <div>
                <h2 className="text-blue-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <CheckSquare size={16} /> CONFIRMED - AWAITING FINAL DISPATCH ({confirmed.length})
                </h2>
                <div className="space-y-3">
                  {confirmed.map(load => renderLoad(load, false))}
                </div>
              </div>
            )}

            {/* Dispatched */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-slate-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Check size={16} /> DISPATCHED & INVENTORY DEDUCTED ({completed.length})
                </h2>
                <div className="space-y-3 opacity-70">
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
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                load.status === "SUPERVISOR_SUBMITTED" ? "bg-amber-500/20 text-amber-300" :
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
              <br/>
              <span className="text-[10px] mt-1 block text-slate-500 font-bold tracking-tight">Created by: {load.createdBy?.name} on {new Date(load.createdAt).toLocaleString()}</span>
            </p>

            <div className="space-y-1 mt-3">
              {load.items?.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-900/40 rounded-lg p-2 text-sm flex gap-4 items-center">
                  <span className="text-white font-medium flex-1">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</span>
                  {editingLoadId === load.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Qty:</span>
                      <input 
                        type="number" 
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-emerald-400 font-bold outline-none focus:border-emerald-500" 
                        value={editData[item.id] || item.quantity} 
                        onChange={(e) => setEditData({...editData, [item.id]: e.target.value})} 
                      />
                    </div>
                  ) : (
                    <span className="text-emerald-400 font-bold">Qty: {item.quantity}</span>
                  )}
                </div>
              ))}
            </div>
            {load.notes && (
              <p className="mt-3 text-sm text-amber-200/80 bg-amber-500/10 p-2 rounded-lg italic">Notes: {load.notes}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-[150px]">
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
                {load.status === "SUPERVISOR_SUBMITTED" && (
                  <button 
                    onClick={() => updateStatus(load.id, "MANAGER_CONFIRMED")}
                    disabled={isUpdating}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition"
                  >
                    {isUpdating ? "..." : "Confirm Load"}
                  </button>
                )}
                {load.status === "MANAGER_CONFIRMED" && (
                  <button 
                    onClick={() => updateStatus(load.id, "DISPATCHED")}
                    disabled={isUpdating}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition"
                  >
                    {isUpdating ? "..." : "Mark Dispatched"}
                  </button>
                )}
                
                {(load.status === "SUPERVISOR_SUBMITTED" || load.status === "MANAGER_CONFIRMED") && (
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
