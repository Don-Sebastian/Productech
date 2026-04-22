"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { ShoppingCart, Clock, CheckCircle, Package, Ban, ChevronDown, ChevronUp, ListChecks, Truck, Star } from "lucide-react";

export default function SupervisorOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>}>
      <SupervisorOrders />
    </Suspense>
  )
}

function SupervisorOrders() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

  const orderIdFromUrl = searchParams?.get('id');

  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0 && !expandedOrder) {
      setExpandedOrder(orderIdFromUrl);
    }
  }, [orderIdFromUrl, orders, expandedOrder]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((data) => {
          const list = data && Array.isArray(data.orders) ? data.orders : (Array.isArray(data) ? data : []);
          setOrders(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>;
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    PENDING: { icon: Clock, color: "text-amber-300", bg: "bg-amber-500/20", label: "Pending" },
    CONFIRMED: { icon: CheckCircle, color: "text-blue-300", bg: "bg-blue-500/20", label: "Confirmed" },
    IN_PRODUCTION: { icon: Package, color: "text-violet-300", bg: "bg-violet-500/20", label: "In Production" },
    PRODUCTION_COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20", label: "✅ Production Done" },
    READY_FOR_DISPATCH: { icon: Truck, color: "text-teal-300", bg: "bg-teal-500/20", label: "Ready for Dispatch" },
    DISPATCHED: { icon: Truck, color: "text-sky-300", bg: "bg-sky-500/20", label: "Dispatched" },
    COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20", label: "Completed" },
    CANCELLED: { icon: Ban, color: "text-red-300", bg: "bg-red-500/20", label: "Cancelled" },
  };

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  // Sort orders by priority (1 first), then date
  const sorted = [...orders].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Filter: show CONFIRMED and PENDING orders that need production
  const pendingOrders = sorted.filter((o) => ["PENDING", "CONFIRMED"].includes(o.status));
  const activeOrders = sorted.filter((o) => ["IN_PRODUCTION"].includes(o.status));
  const completedOrders = sorted.filter((o) => ["PRODUCTION_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "COMPLETED"].includes(o.status));
  const cancelledOrders = sorted.filter((o) => o.status === "CANCELLED");

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingCart size={28} className="text-amber-400" /> Orders
            </h1>
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-1 flex">
              <button 
                onClick={() => setViewMode("ACTIVE")} 
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${viewMode === "ACTIVE" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
              >
                Active
              </button>
              <button 
                onClick={() => setViewMode("HISTORY")} 
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${viewMode === "HISTORY" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"}`}
              >
                History
              </button>
            </div>
          </div>
          <p className="text-slate-400 text-sm">View orders and create production lists</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>
        ) : (
          <div className="space-y-6">
            {viewMode === "ACTIVE" && pendingOrders.length === 0 && activeOrders.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">No active orders</p>
              </div>
            )}
            
            {viewMode === "HISTORY" && completedOrders.length === 0 && cancelledOrders.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
                <Package size={48} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">No historical orders</p>
              </div>
            )}

            {/* Pending Orders */}
            {viewMode === "ACTIVE" && pendingOrders.length > 0 && (
              <div>
                <h2 className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} /> NEEDS PRODUCTION ({pendingOrders.length})
                </h2>
                <div className="space-y-2">
                  {pendingOrders.map((order) => renderOrder(order))}
                </div>
              </div>
            )}

            {/* Active Production */}
            {viewMode === "ACTIVE" && activeOrders.length > 0 && (
              <div>
                <h2 className="text-violet-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Package size={16} /> IN PRODUCTION ({activeOrders.length})
                </h2>
                <div className="space-y-2">
                  {activeOrders.map((order) => renderOrder(order))}
                </div>
              </div>
            )}

            {/* Completed */}
            {viewMode === "HISTORY" && completedOrders.length > 0 && (
              <div>
                <h2 className="text-emerald-400 font-bold text-sm mb-3">COMPLETED ({completedOrders.length})</h2>
                <div className="space-y-2">
                  {completedOrders.map((order) => renderOrder(order))}
                </div>
              </div>
            )}

            {viewMode === "HISTORY" && cancelledOrders.length > 0 && (
              <div>
                <h2 className="text-slate-400 font-bold text-sm mb-3">CANCELLED ({cancelledOrders.length})</h2>
                <div className="space-y-2">
                  {cancelledOrders.map((order) => renderOrder(order))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function renderOrder(order: any) {
    const sc = statusConfig[order.status] || statusConfig.PENDING;
    const StatusIcon = sc.icon;
    const isExpanded = expandedOrder === order.id;
    const pc = priorityConfig[order.priority] || priorityConfig[3];
    
    const orderTargetQty = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
    const orderProducedQty = order.productionLists?.reduce((s: number, pl: any) => s + pl.items?.reduce((ps: number, item: any) => ps + (item.producedQuantity || 0), 0), 0) || 0;
    const progressPercent = orderTargetQty > 0 ? Math.min(100, Math.round((orderProducedQty / orderTargetQty) * 100)) : 0;
    
    const isProductionComplete = order.status === "PRODUCTION_COMPLETED" || (progressPercent >= 100 && !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status));

    return (
      <div key={order.id} className={`bg-slate-800/40 border rounded-2xl overflow-hidden ${
        isProductionComplete ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : "border-slate-700/50"
      }`}>
        <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon size={18} className={sc.color} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-amber-400 bg-amber-500/10 px-2  rounded-md border border-amber-500/20 mb-1 uppercase tracking-widest font-black text-lg">{order.customer?.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pc.bg} ${pc.color}`}>{pc.label}</span>
                {isProductionComplete && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">
                    ✅ Ready
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs truncate">{order.orderNumber} • {order.items?.length} items</p>
              {/* Progress Bar */}
              {!["PENDING", "CANCELLED", "COMPLETED"].includes(order.status) && orderTargetQty > 0 && (
                <div className="flex items-center gap-2 w-full max-w-[200px] mt-2">
                  <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${progressPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className={`text-[9px] font-black ${progressPercent >= 100 ? "text-emerald-400" : "text-blue-400"}`}>{orderProducedQty}/{orderTargetQty}</span>
                </div>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronUp className="text-slate-500" size={18} /> : <ChevronDown className="text-slate-500" size={18} />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-slate-900/40 rounded-xl p-3">
                <p className="text-white font-semibold text-sm">
                  {item.category?.name} • {item.thickness?.value}mm • {item.size?.label}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Qty: <span className="text-white font-medium">{item.quantity}</span>
                  {item.layers && <> • {item.layers}-layer</>}
                  {item.brandSeal && <> • <span className="text-emerald-400">Seal</span></>}
                  {item.varnish && <> • <span className="text-amber-400">Varnish</span></>}
                </p>
              </div>
            ))}

            {/* Timeline Events */}
            {order.timelineEvents && order.timelineEvents.length > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-4 mb-2">
                <button 
                  onClick={() => setExpandedTimelineId(expandedTimelineId === order.id ? null : order.id)}
                  className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition"
                >
                  <span>Order Timeline</span>
                  {expandedTimelineId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedTimelineId === order.id && (
                  <div className="relative pl-3 space-y-4 mt-4">
                    <div className="absolute left-[3px] top-2 bottom-0 w-0.5 bg-slate-700"></div>
                    {order.timelineEvents.map((event: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <p className="text-sm font-bold text-white leading-none mb-1.5">{event.action}</p>
                        <p className="text-xs text-slate-400">{event.details}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(event.createdAt).toLocaleString('en-IN')}</p>
                          {event.user?.name && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium">{event.user.name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Production List button */}
            {(order.status === "CONFIRMED" || order.status === "PENDING") && (
              <button
                onClick={() => router.push(`/supervisor/production-list?orderId=${order.id}`)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition flex items-center justify-center gap-2 mt-2"
              >
                <ListChecks size={18} /> Create Production List
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
}
