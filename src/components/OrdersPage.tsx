"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Plus,
  X,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Ban,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
  Star,
  CalendarClock,
  Search,
  ShoppingCart,
  History,
  ListChecks,
} from "lucide-react";
import {
  calcListProductionMinutes,
  calcEstimatedDates,
  formatDate,
  formatDays,
  type PressSettings,
} from "@/lib/productionEstimate";
import dynamic from "next/dynamic";

const CreateOrderModal = dynamic(() => import("./CreateOrderModal"), {
  ssr: false,
});

interface UserType {
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface OrdersPageProps {
  user: UserType;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-amber-300", bg: "bg-amber-500/20", label: "Pending" },
  CONFIRMED: { icon: CheckCircle, color: "text-blue-300", bg: "bg-blue-500/20", label: "Confirmed" },
  IN_PRODUCTION: { icon: Package, color: "text-violet-300", bg: "bg-violet-500/20", label: "In Production" },
  PRODUCTION_COMPLETED: { icon: CheckCircle, color: "text-emerald-300", bg: "bg-emerald-500/20", label: "✅ Ready to Dispatch" },
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

export default function OrdersPage({ user }: OrdersPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      }
    >
      <OrdersContent user={user} />
    </Suspense>
  );
}

function OrdersContent({ user }: OrdersPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = user.role as "SUPERVISOR" | "MANAGER" | "OWNER";

  const isOwner = role === "OWNER";
  const isSupervisor = role === "SUPERVISOR";
  const isManagerOrOwner = ["MANAGER", "OWNER"].includes(role);

  // Theme configuration
  const theme = useMemo(() => {
    const config = {
      SUPERVISOR: {
        accent: "text-amber-400",
        spinner: "border-amber-400",
        focus: "focus:ring-amber-500/50",
        button: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
        title: "Orders",
        desc: "View orders and create production lists",
        icon: ShoppingCart,
      },
      MANAGER: {
        accent: "text-blue-400",
        spinner: "border-blue-400",
        focus: "focus:ring-blue-500/50",
        button: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500",
        title: "Orders",
        desc: "View orders and manage customer entries",
        icon: ShoppingCart,
      },
      OWNER: {
        accent: "text-emerald-400",
        spinner: "border-emerald-400",
        focus: "focus:ring-emerald-500/50",
        button: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
        title: "Order History",
        desc: "Audit trail for all customer orders.",
        icon: History,
      },
    };
    return config[role] || config.MANAGER;
  }, [role]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [confirmDispatchId, setConfirmDispatchId] = useState<string | null>(null);

  const orderIdFromUrl = searchParams?.get("id");

  const { data: pageData, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ["orders", role],
    queryFn: async () => {
      if (isManagerOrOwner) {
        const [o, p, custom] = await Promise.all([
          fetch("/api/orders").then((r) => r.json()),
          fetch("/api/company-products").then((r) => r.json()),
          fetch("/api/customizations").then((r) => r.json()),
        ]);
        return { o, p, custom };
      } else {
        const o = await fetch("/api/orders").then((r) => r.json());
        return { o, p: [], custom: [] };
      }
    },
  });

  const { orders, pressSettings, productTimings } = useMemo(() => {
    let orders: any[] = [];
    let pressSettings: PressSettings = { workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 };
    let productTimings: any[] = [];

    if (pageData) {
      const { o } = pageData;
      if (o && Array.isArray(o.orders)) {
        orders = o.orders;
        if (o.pressSettings) pressSettings = o.pressSettings;
        if (o.productTimings) productTimings = o.productTimings;
      } else if (Array.isArray(o)) {
        orders = o;
      }
    }
    return { orders, pressSettings, productTimings };
  }, [pageData]);

  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0 && !expandedOrder) {
      setExpandedOrder(orderIdFromUrl);
    }
  }, [orderIdFromUrl, orders, expandedOrder]);

  const deleteOrder = async (id: string) => {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const updatePriority = async (id: string, newPriority: number) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    fetchData();
  };

  const handleDispatch = async (id: string) => {
    try {
      await updateStatus(id, "READY_FOR_DISPATCH");
      setConfirmDispatchId(null);
    } catch {
      alert("Network error");
    }
  };

  // Sort and filter orders
  const displayOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    let list = [];
    if (isSupervisor) {
      const pending = sorted.filter((o) => ["PENDING", "CONFIRMED"].includes(o.status));
      const active = sorted.filter((o) => ["IN_PRODUCTION"].includes(o.status));
      const completed = sorted.filter((o) =>
        ["PRODUCTION_COMPLETED", "READY_FOR_DISPATCH", "DISPATCHED", "COMPLETED"].includes(o.status)
      );
      const cancelled = sorted.filter((o) => o.status === "CANCELLED");

      if (viewMode === "ACTIVE") {
        list = [...pending, ...active];
      } else {
        list = [...completed, ...cancelled];
      }
    } else {
      const active = sorted.filter((o) => !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
      const history = sorted.filter((o) => ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(o.status));
      list = viewMode === "ACTIVE" ? active : history;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, viewMode, searchQuery, isSupervisor]);

  const TitleIcon = theme.icon;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <TitleIcon className={theme.accent} size={28} /> {theme.title}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{theme.desc}</p>
            </div>

            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode("ACTIVE")}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${
                  viewMode === "ACTIVE"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode("HISTORY")}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${
                  viewMode === "HISTORY"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                History
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search order or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 ${theme.focus}`}
              />
            </div>
            {isManagerOrOwner && (
              <button
                onClick={() => {
                  setEditingOrder(null);
                  setShowCreate(true);
                }}
                className={`${theme.button} text-white px-4 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg active:scale-[0.97] transition whitespace-nowrap`}
              >
                <Plus size={20} /> New Order
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.spinner}`} />
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Package size={56} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 text-xl font-medium">
              No {viewMode === "ACTIVE" ? "active" : "historical"} orders found.
            </p>
            <p className="text-slate-600 text-sm mt-2">Any orders reaching final stages will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order: any) => {
              const sc = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = sc.icon;
              const isExpanded = expandedOrder === order.id;
              const pc = priorityConfig[order.priority] || priorityConfig[3];

              const orderTargetQty = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
              const orderProducedQty =
                order.productionLists?.reduce(
                  (s: number, pl: any) =>
                    s + pl.items?.reduce((ps: number, item: any) => ps + (item.producedQuantity || 0), 0),
                  0
                ) || 0;
              const progressPercent =
                orderTargetQty > 0 ? Math.min(100, Math.round((orderProducedQty / orderTargetQty) * 100)) : 0;

              const isProductionComplete =
                order.status === "PRODUCTION_COMPLETED" ||
                (progressPercent >= 100 && !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status));

              // Estimation
              const prodMinutes = calcListProductionMinutes(
                (order.items || []).map((i: any) => ({
                  quantity: i.quantity,
                  categoryId: i.categoryId,
                  thicknessId: i.thicknessId,
                })),
                productTimings,
                pressSettings
              );
              const hasTimings = prodMinutes > 0;
              const { dispatchDate, productionDays } = hasTimings
                ? calcEstimatedDates(order.createdAt, prodMinutes, pressSettings)
                : { dispatchDate: null, productionDays: 0 };

              return (
                <div
                  key={order.id}
                  className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all hover:bg-slate-800/60 ${
                    isExpanded ? (isOwner ? "border-emerald-500/30" : "border-blue-500/30") : "border-slate-700/50"
                  } ${isProductionComplete ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : ""}`}
                >
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full p-4 md:p-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={24} className={sc.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-black text-lg">{order.orderNumber}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-900 text-slate-400">
                            {order.status.replace("_", " ")}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pc.bg} ${pc.color}`}>
                            {pc.label}
                          </span>
                          {isProductionComplete && order.status !== "READY_FOR_DISPATCH" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold animate-pulse">
                              ✅ Ready
                            </span>
                          )}
                          {order.status === "READY_FOR_DISPATCH" && (
                            <span className="text-xs px-2 py-1 rounded-full bg-teal-500/25 text-teal-300 font-black flex items-center gap-1 border border-teal-500/30 shadow-lg">
                              <Truck size={12} /> Marked for Dispatch
                            </span>
                          )}
                          {order.estimatedDispatchDate && !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status) && (
                            <span className="text-xs px-2 py-1 rounded-full bg-violet-600 text-white font-black shadow-lg flex items-center gap-1 border border-violet-400/30 animate-pulse">
                              <Truck size={12} className="fill-current" />
                              DISPATCH: {formatDate(new Date(order.estimatedDispatchDate))}
                            </span>
                          )}
                          {!order.estimatedDispatchDate && hasTimings && dispatchDate && !["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-bold flex items-center gap-1">
                              <CalendarClock size={11} />
                              Est. {formatDate(dispatchDate)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isOwner ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-blue-400 bg-blue-500/10 border-blue-500/20"}`}>
                            {order.customer?.name}
                          </span>
                          <span className="text-slate-500 text-[10px] uppercase font-bold">
                            Created {formatDate(new Date(order.createdAt))}
                          </span>
                          <span className="text-slate-400 text-xs truncate">
                            • {order.items?.length} item(s)
                            {hasTimings && productionDays > 0 && (
                              <span className="ml-2 text-orange-400">• ~{formatDays(productionDays)} production</span>
                            )}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        {!["PENDING", "CANCELLED", "COMPLETED"].includes(order.status) && orderTargetQty > 0 && (
                          <div className="flex items-center gap-2 w-full max-w-[200px] mt-2">
                            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  progressPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className={`text-[9px] font-black ${progressPercent >= 100 ? "text-emerald-400" : "text-blue-400"}`}>
                              {orderProducedQty}/{orderTargetQty}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex flex-col items-end">
                        <span className={`text-[10px] font-black p-1 rounded ${pc.bg} ${pc.color} mb-1`}>
                          {pc.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-6 border-t border-slate-700/50 pt-5">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Details */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Priority Update for Managers/Owners */}
                          {isManagerOrOwner &&
                            order.status !== "COMPLETED" &&
                            order.status !== "CANCELLED" &&
                            order.status !== "DISPATCHED" && (
                              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-slate-500">Priority Level</p>
                                  <button
                                    onClick={() => setEditingPriorityId(editingPriorityId === order.id ? null : order.id)}
                                    className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition hover:bg-slate-600"
                                  >
                                    {editingPriorityId === order.id ? "Done" : "Edit Priority"}
                                  </button>
                                </div>
                                {editingPriorityId === order.id ? (
                                  <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((p) => {
                                      const pConf = priorityConfig[p];
                                      return (
                                        <button
                                          key={p}
                                          onClick={async () => {
                                            await updatePriority(order.id, p);
                                            setEditingPriorityId(null);
                                          }}
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition active:scale-[0.95] ${
                                            order.priority === p
                                              ? `${pConf.bg} ${pConf.color} ring-1 ring-current`
                                              : "bg-slate-700/50 text-slate-500 hover:bg-slate-700"
                                          }`}
                                        >
                                          P{p}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div
                                    className={`inline-block py-1 px-3 rounded text-xs font-bold ${
                                      priorityConfig[order.priority]?.bg || "bg-slate-700"
                                    } ${priorityConfig[order.priority]?.color || "text-white"}`}
                                  >
                                    Priority {order.priority}
                                  </div>
                                )}
                              </div>
                            )}

                          <div>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                              Order Items
                            </h4>
                            <div className="space-y-2">
                              {order.items?.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="text-white font-bold">
                                      {item.category?.name} • {item.thickness?.value}mm • {item.size?.label}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.layers && (
                                        <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-bold">
                                          {item.layers} Layers
                                        </span>
                                      )}
                                      {item.brandSeal && (
                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">
                                          Brand Seal
                                        </span>
                                      )}
                                      {item.varnish && (
                                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full font-bold">
                                          Varnish
                                        </span>
                                      )}
                                      {item.customizations?.map((c: any) => (
                                        <span
                                          key={c.id}
                                          className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-bold"
                                        >
                                          {c.name}
                                        </span>
                                      ))}
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
                              <h4 className="text-xs font-black text-amber-400/50 uppercase tracking-widest mb-1">
                                Order Notes
                              </h4>
                              <p className="text-amber-200/80 italic text-sm">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Customer & timeline */}
                        <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-800 h-fit space-y-6">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                              Customer Details
                            </h4>
                            <p className="text-white font-bold">{order.customer?.name}</p>
                            <p className="text-slate-400 text-sm mt-1">
                              {order.customer?.phone || "No phone provided"}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-slate-800">
                            <button
                              onClick={() => setExpandedTimelineId(expandedTimelineId === order.id ? null : order.id)}
                              className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition"
                            >
                              <span>Timeline</span>
                              {expandedTimelineId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {expandedTimelineId === order.id && (
                              <div className="space-y-4 mt-4">
                                {order.timelineEvents && order.timelineEvents.length > 0 ? (
                                  order.timelineEvents.map((event: any, idx: number) => (
                                    <div key={idx} className="flex gap-3 text-xs">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 ring-2 ring-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                      <div>
                                        <p className="text-white font-bold">{event.action}</p>
                                        <p className="text-slate-400 mt-0.5">{event.details}</p>
                                        <p className="text-slate-500 text-[10px] mt-1">
                                          {new Date(event.createdAt).toLocaleString("en-IN")}
                                        </p>
                                        {event.user?.name && (
                                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded font-medium mt-1 inline-block">
                                            {event.user.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex gap-3 opacity-60 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-slate-400">Created</p>
                                      <p className="text-slate-600 text-[10px]">
                                        {new Date(order.createdAt).toLocaleString("en-IN")} by {order.createdBy?.name}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Role-based action buttons */}
                          <div className="space-y-2 pt-4 border-t border-slate-800">
                            {/* Supervisor production triggers */}
                            {isSupervisor && (order.status === "CONFIRMED" || order.status === "PENDING") && (
                              <button
                                onClick={() => router.push(`/supervisor/production-list?orderId=${order.id}`)}
                                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition flex items-center justify-center gap-2 text-sm"
                              >
                                <ListChecks size={16} /> Create Production List
                              </button>
                            )}

                            {/* Manager Actions */}
                            {isManagerOrOwner && (
                              <>
                                {order.status === "PENDING" && (
                                  <button
                                    onClick={() => updateStatus(order.id, "CONFIRMED")}
                                    className="w-full py-2.5 bg-blue-600/20 text-blue-300 font-semibold rounded-xl text-sm hover:bg-blue-600/30 active:scale-[0.97] transition"
                                  >
                                    ✓ Confirm Order
                                  </button>
                                )}

                                {!["DISPATCHED", "COMPLETED", "CANCELLED"].includes(order.status) && (
                                  <div>
                                    {order.status === "READY_FOR_DISPATCH" ? (
                                      <div className="w-full py-2.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80">
                                        <Truck size={16} /> Marked for Dispatch
                                      </div>
                                    ) : confirmDispatchId === order.id ? (
                                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                                        <p className="text-amber-400 text-sm font-bold mb-1">Mark Ready For Dispatch?</p>
                                        <p className="text-amber-500/80 text-[10px] mb-4">
                                          {progressPercent < 100
                                            ? `Production is at ${progressPercent}%. Dispatch anyway?`
                                            : "Mark order ready for dispatch?"}
                                        </p>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleDispatch(order.id)}
                                            className="flex-1 py-2 bg-amber-600 text-white font-bold text-xs rounded shadow hover:bg-amber-500"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() => setConfirmDispatchId(null)}
                                            className="flex-1 py-2 bg-slate-700 text-slate-300 font-bold text-xs rounded hover:bg-slate-600"
                                          >
                                            No
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDispatchId(order.id)}
                                        className="w-full py-2.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold rounded-xl text-sm active:scale-[0.97] transition flex items-center justify-center gap-2 hover:bg-violet-600/30"
                                      >
                                        <Truck size={16} />
                                        Mark Ready for Dispatch
                                      </button>
                                    )}
                                  </div>
                                )}

                                {order.status !== "CANCELLED" &&
                                  order.status !== "COMPLETED" &&
                                  order.status !== "DISPATCHED" && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingOrder(order);
                                          setShowCreate(true);
                                        }}
                                        className="flex-1 py-2 bg-slate-750 border border-slate-700 text-slate-300 font-semibold rounded-lg text-xs hover:text-white transition"
                                      >
                                        ✎ Edit
                                      </button>
                                      {deleteConfirm === order.id ? (
                                        <div className="flex-[2] flex gap-2">
                                          <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="flex-1 py-2 bg-red-650 text-white font-semibold rounded-lg text-xs"
                                          >
                                            Delete
                                          </button>
                                          <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setDeleteConfirm(order.id)}
                                          className="flex-1 py-2 bg-red-600/20 border border-red-500/20 text-red-300 font-semibold rounded-lg text-xs hover:bg-red-600/30"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                              </>
                            )}
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

      {showCreate && (
        <CreateOrderModal
          initialOrder={editingOrder}
          onClose={() => {
            setShowCreate(false);
            setEditingOrder(null);
          }}
          onSuccess={() => {
            setShowCreate(false);
            setEditingOrder(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
