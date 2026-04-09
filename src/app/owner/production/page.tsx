"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Factory,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  History,
  ListChecks,
  Package,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function OwnerProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prodLists, setProdLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [expandedList, setExpandedList] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
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
      const matchesSearch = 
        l.listNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.order?.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.order?.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
      
      return matchesMode && matchesSearch && matchesStatus;
    }).sort((a, b) => {
       if (a.priority !== b.priority) return a.priority - b.priority;
       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [prodLists, viewMode, searchQuery, statusFilter]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    PLANNED: { icon: Clock, bg: "bg-slate-500/20", text: "text-slate-300", label: "Planned" },
    PEELING: { icon: Factory, bg: "bg-amber-500/20", text: "text-amber-300", label: "Peeling" },
    DRYING: { icon: Factory, bg: "bg-blue-500/20", text: "text-blue-300", label: "Drying" },
    PRESSING: { icon: Factory, bg: "bg-violet-500/20", text: "text-violet-300", label: "Awaiting Verification" },
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

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                <Factory size={28} className="text-emerald-400" /> Production Auditing
              </h1>
              <p className="text-slate-400 text-sm mt-1">Full oversight of company production runs.</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-1 flex shadow-inner">
              <button 
                onClick={() => setViewMode("ACTIVE")} 
                className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${viewMode === "ACTIVE" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                ONGOING
              </button>
              <button 
                onClick={() => setViewMode("HISTORY")} 
                className={`px-4 py-1.5 text-xs font-black rounded-md transition-all ${viewMode === "HISTORY" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                FINALIZED
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by list, order, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700/50 rounded-2xl text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm"
            />
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 px-1">Total Runs</p>
            <p className="text-3xl font-black text-white">{prodLists.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 px-1">Active</p>
            <p className="text-3xl font-black text-amber-400">{prodLists.filter(l => !["COMPLETED","REJECTED","CANCELLED"].includes(l.status)).length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 px-1">Dispatched/Done</p>
            <p className="text-3xl font-black text-emerald-400">{prodLists.filter(l => l.status === "COMPLETED").length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 px-1">Verification Wait</p>
            <p className="text-3xl font-black text-violet-400">{prodLists.filter(l => l.status === "PRESSING").length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>
        ) : displayLists.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-24 text-center">
             <Factory size={64} className="mx-auto text-slate-800 mb-4" />
             <p className="text-slate-500 font-black uppercase tracking-widest text-xl">Audit Log Empty</p>
             <p className="text-slate-600 text-sm mt-2 font-bold max-w-md mx-auto">No {viewMode.toLowerCase()} production lists match your current search or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
             {displayLists.map((list) => {
               const config = statusConfig[list.status] || statusConfig.PLANNED;
               const StatusIcon = config.icon;
               const pc = priorityConfig[list.priority] || priorityConfig[3];
               const isExpanded = expandedList === list.id;
               const totalTarget = list.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
               const totalProd = list.items?.reduce((s: number, i: any) => s + (i.producedQuantity || 0), 0) || 0;
               const progress = totalTarget > 0 ? Math.round((totalProd / totalTarget) * 100) : 0;

               return (
                 <div key={list.id} className={`bg-slate-900/60 border rounded-3xl overflow-hidden transition-all hover:bg-slate-900 ${
                   isExpanded ? "border-emerald-500/40 shadow-emerald-900/10" : "border-slate-800 shadow-xl"
                 }`}>
                   <button onClick={() => setExpandedList(isExpanded ? null : list.id)}
                    className="w-full p-6 flex flex-col sm:flex-row sm:items-center justify-between text-left gap-4">
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                          <StatusIcon size={28} className={config.text} />
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-white font-black text-lg whitespace-nowrap">
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 mr-3 uppercase tracking-widest font-black text-lg">
                               {list.order?.customer?.name || "COMPANY NAME"}
                             </span>
                            {list.listNumber}
                          </h3>
                             <span className={`text-[10px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest ${pc.bg} ${pc.color}`}>{pc.label}</span>
                             <span className={`text-[10px] px-2.5 py-1 rounded-md font-black uppercase tracking-widest ${config.bg} ${config.text}`}>{config.label}</span>
                           </div>
                           <p className="text-slate-500 text-xs font-bold leading-relaxed truncate">
                              {list.order?.orderNumber && `${list.order.orderNumber} • `}
                              {list.order?.customer?.name && `${list.order.customer.name} • `}
                              {list.items?.length} items • Managed by {list.createdBy?.name}
                           </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 pl-14 sm:pl-0">
                         <div className="text-right">
                           <p className={`text-2xl font-black ${progress >= 100 ? "text-emerald-400" : "text-amber-400"}`}>{progress}%</p>
                           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Efficiency</p>
                         </div>
                         {isExpanded ? <ChevronUp className="text-slate-500" size={24} /> : <ChevronDown className="text-slate-500" size={24} />}
                      </div>
                   </button>

                   {isExpanded && (
                     <div className="px-6 pb-8 border-t border-slate-800/50 pt-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                           {/* Item Details */}
                           <div className="xl:col-span-2 space-y-4">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Detailed Production Run</h4>
                              {list.items?.map((item: any, idx: number) => {
                                const itemProg = item.quantity > 0 ? Math.min(100, Math.round((item.producedQuantity / item.quantity) * 100)) : 0;
                                return (
                                  <div key={idx} className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 shadow-inner group transition hover:border-slate-700">
                                     <div className="flex items-center justify-between mb-4">
                                        <div>
                                          <p className="text-white font-black text-sm uppercase">{item.category?.name}</p>
                                          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">{item.thickness?.value}mm • {item.size?.label}</p>
                                        </div>
                                        <div className="text-right">
                                           <span className={`text-xl font-black ${itemProg >= 100 ? "text-emerald-400" : "text-amber-400"}`}>{item.producedQuantity}</span>
                                           <span className="text-slate-700 text-sm font-black mx-1">/</span>
                                           <span className="text-slate-500 text-sm font-black">{item.quantity}</span>
                                        </div>
                                     </div>
                                     <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${itemProg >= 100 ? "bg-emerald-500" : "bg-emerald-500/40"}`}
                                          style={{ width: `${itemProg}%` }} />
                                     </div>
                                     <div className="flex flex-wrap gap-2">
                                        {item.layers && <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md uppercase tracking-tighter">{item.layers} Layers</span>}
                                        {item.brandSeal && <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md uppercase tracking-tighter">Seal ✓</span>}
                                        {item.varnish && <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md uppercase tracking-tighter">Varnish ✓</span>}
                                     </div>
                                  </div>
                                );
                              })}
                           </div>

                           {/* Metadata Card */}
                           <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Operational Context</h4>
                              <div className="bg-slate-800/20 rounded-3xl p-6 border border-slate-800/80 space-y-6">
                                 <div>
                                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Company Origin</p>
                                    <p className="text-white font-black text-sm uppercase tracking-tight">{list.company?.name || session.user?.name}&apos;s Floor</p>
                                 </div>
                                 <div className="pt-6 border-t border-slate-800/50">
                                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Timeline</p>
                                    <div className="space-y-2 mt-3">
                                       <div className="flex items-center gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">Started: {new Date(list.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                       </div>
                                       <div className="flex items-center gap-3 opacity-60">
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                          <p className="text-slate-500 text-xs font-bold uppercase tracking-tight">Status: {list.status.replace("_", " ")}</p>
                                       </div>
                                    </div>
                                 </div>
                                 {list.notes && (
                                   <div className="pt-6 border-t border-slate-800/50">
                                      <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-2 px-1 text-center">Auditor&apos;s Notes</p>
                                      <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
                                         <p className="text-slate-400 text-xs italic leading-relaxed text-center">&quot;{list.notes}&quot;</p>
                                      </div>
                                   </div>
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
    </div>
  );
}
