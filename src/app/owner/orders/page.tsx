"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Plus, X, Package, Clock, CheckCircle, Truck, Ban, 
  ChevronDown, ChevronUp, History, ClipboardList, Search,
  ShoppingCart, Star
} from "lucide-react";

export default function OwnerOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((o) => {
        const list = o && Array.isArray(o.orders) ? o.orders : (Array.isArray(o) ? o : []);
        setOrders(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    PENDING: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", label: "Pending" },
    CONFIRMED: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10", label: "Confirmed" },
    IN_PRODUCTION: { icon: Package, color: "text-indigo-400", bg: "bg-indigo-500/10", label: "In Production" },
    PRODUCTION_COMPLETED: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Production Done" },
    READY_FOR_DISPATCH: { icon: Truck, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Ready for Dispatch" },
    DISPATCHED: { icon: ShoppingCart, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Dispatched" },
    COMPLETED: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Completed" },
    CANCELLED: { icon: Ban, color: "text-red-400", bg: "bg-red-500/10", label: "Cancelled" },
  };

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  const displayOrders = useMemo(() => {
    let list = [...orders];
    
    // Sort: priority then date
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Separation
    const active = list.filter(o => !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
    const history = list.filter(o => ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
    
    let filtered = viewMode === "ACTIVE" ? active : history;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.orderNumber?.toLowerCase().includes(q) || 
        o.customer?.name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [orders, viewMode, searchQuery]);

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <History className="text-emerald-400" size={28} /> Order History
              </h1>
              <p className="text-slate-400 text-sm mt-1">Audit trail for all customer orders.</p>
            </div>
            
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

          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search order or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" /></div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Package size={56} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 text-xl font-medium">No {viewMode === "ACTIVE" ? "active" : "historical"} orders found.</p>
            <p className="text-slate-600 text-sm mt-2">Any orders reaching final stages will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order) => {
              const sc = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = sc.icon;
              const isExpanded = expandedOrder === order.id;
              const pc = priorityConfig[order.priority] || priorityConfig[3];

              return (
                <div key={order.id} className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all hover:bg-slate-800/60 ${isExpanded ? "border-emerald-500/30" : "border-slate-700/50"}`}>
                  <button 
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={24} className={sc.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-black text-lg">{order.orderNumber}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-900 text-slate-400`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-slate-300 font-bold truncate">
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 mr-2 uppercase tracking-widest font-black text-xs">
                            {order.customer?.name}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex flex-col items-end">
                        <span className={`text-[10px] font-black p-1 rounded ${pc.bg} ${pc.color} mb-1`}>{pc.label}</span>
                        <span className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-6 border-t border-slate-700/50 pt-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary */}
                        <div className="lg:col-span-2 space-y-6">
                          <div>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Order Items</h4>
                            <div className="space-y-2">
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-bold">{item.category?.name} • {item.thickness?.value}mm • {item.size?.label}</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.layers && <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-bold">{item.layers} Layers</span>}
                                      {item.brandSeal && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">Brand Seal</span>}
                                      {item.varnish && <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full font-bold">Varnish</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-emerald-400 font-black text-lg">x{item.quantity}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {order.notes && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                              <h4 className="text-xs font-black text-amber-400/50 uppercase tracking-widest mb-1">Manager Notes</h4>
                              <p className="text-amber-200/80 italic text-sm">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Sidebar info */}
                        <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-800 h-fit space-y-6">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Customer Details</h4>
                            <p className="text-white font-bold">{order.customer?.name}</p>
                            <p className="text-slate-400 text-sm mt-1">{order.customer?.phone || "No phone provided"}</p>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Timeline</h4>
                            <div className="space-y-4">
                              {order.timeline?.map((event: any, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-white text-sm font-bold">{event.action}</p>
                                    <p className="text-slate-500 text-[10px]">{new Date(event.createdAt).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                              <div className="flex gap-3 opacity-60">
                                <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
                                <div>
                                  <p className="text-slate-400 text-sm">Created</p>
                                  <p className="text-slate-600 text-[10px]">{new Date(order.createdAt).toLocaleString()} by {order.createdBy?.name}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
