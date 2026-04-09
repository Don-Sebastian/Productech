"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Truck, Package, Clock, CheckCircle } from "lucide-react";

export default function OwnerDispatchHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [dispatchLoads, setDispatchLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/dispatch")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setDispatchLoads(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>;
  }

  // Focus only on DISPATCHED items for history, and active items for visibility
  const activeLoads = dispatchLoads.filter(l => l.status !== "DISPATCHED");
  const completedLoads = dispatchLoads.filter(l => l.status === "DISPATCHED");

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Truck size={28} className="text-emerald-400" /> Dispatch History
          </h1>
          <p className="text-slate-400 text-sm mt-1">Full transparency into all plywood leaving the facility.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>
        ) : (
          <div className="space-y-8">
            
            {activeLoads.length > 0 && (
              <section>
                <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={18} /> PENDING DISPATCH LOADS ({activeLoads.length})
                </h2>
                <div className="space-y-3">
                  {activeLoads.map(load => renderLoad(load))}
                </div>
              </section>
            )}

            {completedLoads.length > 0 && (
              <section>
                <h2 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <CheckCircle size={18} /> COMPLETED DISPATCHES ({completedLoads.length})
                </h2>
                <div className="space-y-3">
                  {completedLoads.map(load => renderLoad(load))}
                </div>
              </section>
            )}

            {dispatchLoads.length === 0 && (
              <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 font-medium text-lg">No dispatch history available yet.</p>
                <p className="text-slate-500 text-sm mt-2">When managers finalize dispatch loads, they will appear here permanently.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function renderLoad(load: any) {
    return (
      <div key={load.id} className={`bg-slate-800/40 border rounded-2xl overflow-hidden p-5 ${load.status === "DISPATCHED" ? "border-emerald-500/20" : "border-slate-700/50"}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="text-white font-black text-xl tracking-tight">{load.loadNumber}</h3>
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                load.status === "SUPERVISOR_SUBMITTED" ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30" :
                load.status === "MANAGER_CONFIRMED" ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30" :
                "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
              }`}>{load.status.replace("_", " ")}</span>
            </div>
            
            <div className="bg-slate-900/40 rounded-xl p-3 inline-block mb-4 border border-slate-800">
              <p className="text-slate-300 text-sm">
                <span className="text-slate-500 uppercase text-xs font-bold mr-2">Link To Order:</span>
                <span className="font-bold text-white">{load.order?.orderNumber}</span> • {load.order?.customer?.name}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-1">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>Initiated by: <span className="text-white font-medium">{load.createdBy?.name || "Unknown"}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>Date: <span className="text-white font-medium">{new Date(load.createdAt).toLocaleString()}</span></span>
              </div>
              {load.manager && (
                <div className="flex items-center gap-2 text-sm text-emerald-400/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
                  <span>Approved by: <span className="text-emerald-300 font-bold">{load.manager.name}</span></span>
                </div>
              )}
              {load.updatedAt && load.status === "DISPATCHED" && (
                <div className="flex items-center gap-2 text-sm text-emerald-400/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
                  <span>Dispatched: <span className="text-emerald-300 font-bold">{new Date(load.updatedAt).toLocaleString()}</span></span>
                </div>
              )}
            </div>

            {load.notes && (
              <p className="mt-4 text-sm text-slate-300 bg-slate-700/30 p-3 rounded-xl border border-slate-600/50 italic flex gap-2">
                <span className="text-slate-500 not-italic font-bold">Notes:</span> {load.notes}
              </p>
            )}
          </div>

          <div className="w-full md:w-1/3 bg-slate-900/60 rounded-xl p-3 border border-slate-800 self-start">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Payload Summary</h4>
            <div className="space-y-2">
              {load.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800/80 px-3 py-2 rounded-lg">
                  <span className="text-slate-300 text-sm font-medium">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</span>
                  <span className="text-emerald-400 font-black">x{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center px-1">
              <span className="text-xs text-slate-400 uppercase font-bold">Total Physical Items:</span>
              <span className="text-white font-black text-lg">{load.items?.reduce((acc: number, item: any) => acc + item.quantity, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
