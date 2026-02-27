"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function SupervisorBatches() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/batches")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setBatches(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productType?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusConfig: Record<string, { icon: any; bg: string; text: string }> = {
    INITIATED: { icon: Clock, bg: "bg-slate-500/20", text: "text-slate-300" },
    IN_PROGRESS: { icon: Clock, bg: "bg-amber-500/20", text: "text-amber-300" },
    COMPLETED: { icon: CheckCircle, bg: "bg-emerald-500/20", text: "text-emerald-300" },
    QUALITY_CHECK: { icon: Eye, bg: "bg-violet-500/20", text: "text-violet-300" },
    FAILED: { icon: XCircle, bg: "bg-red-500/20", text: "text-red-300" },
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <Factory className="text-amber-400" size={28} />
            Batch Status
          </h1>
          <p className="text-slate-400">View and track production batch statuses</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-11 pr-8 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition appearance-none"
            >
              <option value="ALL">All Status</option>
              <option value="INITIATED">Initiated</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="QUALITY_CHECK">Quality Check</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Batches List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-16">
            <Factory size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No batches found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBatches.map((batch) => {
              const config = statusConfig[batch.status] || statusConfig.INITIATED;
              const StatusIcon = config.icon;
              return (
                <div
                  key={batch.id}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {batch.batchNumber?.slice(-3) || "?"}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{batch.batchNumber}</h3>
                        <p className="text-slate-400 text-sm">
                          {batch.productType?.name}
                          {batch.section && ` • ${batch.section}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-white font-medium">{batch.quantity} pcs</p>
                        {batch.defectiveUnits > 0 && (
                          <p className="text-red-400 text-xs flex items-center gap-1 justify-end">
                            <AlertTriangle size={10} />
                            {batch.defectiveUnits} defective
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}>
                        <StatusIcon size={12} />
                        {batch.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  {batch.notes && (
                    <p className="mt-3 text-slate-500 text-sm border-t border-slate-700/50 pt-3">
                      {batch.notes}
                    </p>
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
