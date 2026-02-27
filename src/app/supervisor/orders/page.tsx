"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ShoppingCart, Clock, CheckCircle, Package, Ban, ChevronDown, ChevronUp, ListChecks } from "lucide-react";

export default function SupervisorOrders() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setOrders(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>;
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    PENDING: { icon: Clock, color: "text-amber-300", bg: "bg-amber-500/20" },
    CONFIRMED: { icon: CheckCircle, color: "text-blue-300", bg: "bg-blue-500/20" },
    IN_PRODUCTION: { icon: Package, color: "text-violet-300", bg: "bg-violet-500/20" },
    COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20" },
    CANCELLED: { icon: Ban, color: "text-red-300", bg: "bg-red-500/20" },
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-500/20 text-slate-300",
    NORMAL: "bg-blue-500/20 text-blue-300",
    HIGH: "bg-amber-500/20 text-amber-300",
    URGENT: "bg-red-500/20 text-red-300",
  };

  // Filter: show CONFIRMED and PENDING orders that need production
  const pendingOrders = orders.filter((o) => ["PENDING", "CONFIRMED"].includes(o.status));
  const activeOrders = orders.filter((o) => o.status === "IN_PRODUCTION");
  const otherOrders = orders.filter((o) => ["COMPLETED", "CANCELLED"].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShoppingCart size={28} /> Orders
          </h1>
          <p className="text-slate-400 text-sm mt-1">View orders and create production lists</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>
        ) : (
          <div className="space-y-6">
            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
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
            {activeOrders.length > 0 && (
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
            {otherOrders.length > 0 && (
              <div>
                <h2 className="text-slate-400 font-bold text-sm mb-3">COMPLETED / CANCELLED ({otherOrders.length})</h2>
                <div className="space-y-2">
                  {otherOrders.map((order) => renderOrder(order))}
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

    return (
      <div key={order.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
        <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg ${sc.bg} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon size={18} className={sc.color} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-sm">{order.orderNumber}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[order.priority]}`}>{order.priority}</span>
              </div>
              <p className="text-slate-400 text-xs truncate">{order.customerName} • {order.items?.length} items</p>
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
