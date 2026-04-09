"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Factory,
  ListChecks,
  CheckCircle,
  Clock,
  Package,
  Star,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";

export default function ManagerProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prodLists, setProdLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/production-lists")
        .then((res) => res.json())
        .then((data) => {
          const list = data && Array.isArray(data.lists) ? data.lists : (Array.isArray(data) ? data : []);
          setProdLists(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  const displayLists = useMemo(() => {
    return prodLists.filter(l => {
      const isFinal = l.status === "COMPLETED" && (l.order ? ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(l.order.status) : true);
      const matchesMode = viewMode === "ACTIVE" ? !isFinal : isFinal;
      const matchesFilter = statusFilter === "ALL" || l.status === statusFilter;
      return matchesMode && matchesFilter;
    }).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [prodLists, viewMode, statusFilter]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    PLANNED: { icon: Clock, bg: "bg-slate-500/20", text: "text-slate-300", label: "Planned" },
    PEELING: { icon: Factory, bg: "bg-amber-500/20", text: "text-amber-300", label: "Peeling" },
    DRYING: { icon: Factory, bg: "bg-blue-500/20", text: "text-blue-300", label: "Drying" },
    PRESSING: { icon: Factory, bg: "bg-violet-500/20", text: "text-violet-300", label: "Awaiting Approval" },
    FINISHING: { icon: Factory, bg: "bg-teal-500/20", text: "text-teal-300", label: "Finishing" },
    COMPLETED: { icon: CheckCircle, bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Completed" },
  };

  const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "P1", color: "text-red-300", bg: "bg-red-500/20" },
    2: { label: "P2", color: "text-orange-300", bg: "bg-orange-500/20" },
    3: { label: "P3", color: "text-blue-300", bg: "bg-blue-500/20" },
    4: { label: "P4", color: "text-slate-300", bg: "bg-slate-500/20" },
    5: { label: "P5", color: "text-slate-400", bg: "bg-slate-600/20" },
  };

  const activeLists = prodLists.filter((l) => !(l.status === "COMPLETED" && (l.order ? ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(l.order.status) : true)));
  const historyLists = prodLists.filter((l) => (l.status === "COMPLETED" && (l.order ? ["DISPATCHED", "COMPLETED", "CANCELLED"].includes(l.order.status) : true)));

  // Stats
  const totalTarget = prodLists.reduce((sum, l) => sum + l.items?.reduce((s: number, i: any) => s + i.quantity, 0), 0) || 0;
  const totalProduced = prodLists.reduce((sum, l) => sum + l.items?.reduce((s: number, i: any) => s + (i.producedQuantity || 0), 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                <ListChecks size={28} /> Production Overview
              </h1>
              <p className="text-slate-400 text-sm">Monitor all production lists and progress</p>
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">Total Lists</p>
            <p className="text-3xl font-black text-white">{prodLists.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">Active</p>
            <p className="text-3xl font-black text-amber-400">{activeLists.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">History</p>
            <p className="text-3xl font-black text-emerald-400">{historyLists.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">Overall Progress</p>
            <p className="text-3xl font-black text-cyan-400">{totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {["ALL", "PLANNED", "PEELING", "DRYING", "PRESSING", "FINISHING", "COMPLETED"].map((s) => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all active:scale-[0.95] ${
                statusFilter === s ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {s === "ALL" ? "All Status" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : displayLists.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
            <Package size={56} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 text-xl font-medium">No {viewMode === "ACTIVE" ? "active" : "historical"} lists found</p>
            {statusFilter !== "ALL" && <p className="text-slate-600 text-sm mt-1">Try changing the status filter.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {displayLists.map((list) => {
              const config = statusConfig[list.status] || statusConfig.PLANNED;
              const StatusIcon = config.icon;
              const pc = priorityConfig[list.priority] || priorityConfig[3];
              const isExpanded = expandedList === list.id;
              const totalQty = list.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
              const totalProd = list.items?.reduce((s: number, i: any) => s + (i.producedQuantity || 0), 0) || 0;
              const overallProgress = totalQty > 0 ? Math.round((totalProd / totalQty) * 100) : 0;
              const isComplete = list.status === "COMPLETED";
              const isWaitingApproval = list.status === "PRESSING";

              return (
                <div key={list.id} className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all hover:bg-slate-800/60 ${
                  isWaitingApproval ? "border-violet-500/50 ring-1 ring-violet-500/10" :
                  isComplete ? "border-emerald-500/30" : "border-slate-700/50"
                }`}>
                  <button onClick={() => setExpandedList(isExpanded ? null : list.id)}
                    className="w-full p-5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={24} className={config.text} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-black text-lg">{list.listNumber}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${pc.bg} ${pc.color}`}>{pc.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${config.bg} ${config.text}`}>{config.label}</span>
                        </div>
                        <p className="text-slate-400 text-xs font-bold truncate">
                          <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 mr-2 uppercase tracking-widest font-black">
                            {list.order?.customer?.name || "STOCK"}
                          </span>
                          {list.order?.orderNumber && `${list.order.orderNumber} • `}
                          {list.items?.length} items • Created by {list.createdBy?.name}
                        </p>
                        {/* Progress Bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${overallProgress >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
                              style={{ width: `${overallProgress}%` }} />
                          </div>
                          <span className={`text-xs font-black min-w-[32px] ${overallProgress >= 100 ? "text-emerald-400" : "text-cyan-400"}`}>{overallProgress}%</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-slate-500 ml-4" size={20} /> : <ChevronDown className="text-slate-500 ml-4" size={20} />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-6 border-t border-slate-700/30 pt-5 bg-slate-900/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {list.items?.map((item: any, idx: number) => {
                          const progress = item.quantity > 0 ? Math.min(100, Math.round((item.producedQuantity / item.quantity) * 100)) : 0;
                          return (
                            <div key={idx} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 shadow-sm transition hover:border-slate-600">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <span className="text-white font-black text-sm block leading-tight">
                                    {item.category?.name}
                                  </span>
                                  <span className="text-slate-400 text-xs font-bold">
                                    {item.thickness?.value}mm • {item.size?.label}
                                  </span>
                                </div>
                                <span className={`text-sm font-black p-2 rounded-lg bg-slate-950 ${progress >= 100 ? "text-emerald-400" : "text-cyan-400"}`}>
                                  {item.producedQuantity} / {item.quantity}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
                                  style={{ width: `${progress}%` }} />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                {item.layers && <span className="text-[10px] font-black px-2 py-0.5 bg-slate-700 text-slate-300 rounded uppercase">{item.layers} Layers</span>}
                                {item.brandSeal && <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded uppercase">Seal</span>}
                                {item.varnish && <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded uppercase">Varnish</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {list.notes && (
                        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Supervisor Notes</p>
                          <p className="text-slate-300 text-sm italic">"{list.notes}"</p>
                        </div>
                      )}
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
