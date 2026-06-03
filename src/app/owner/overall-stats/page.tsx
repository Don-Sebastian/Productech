"use client";

import { useQuery } from "@tanstack/react-query";
import { Gauge, Factory, Users, ShoppingCart, Package } from "lucide-react";

export default function OverallStatsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["overall-stats"],
    queryFn: () => fetch("/api/owner/overall-stats").then((res) => {
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }),
  });

  if (isLoading) return <div className="p-6 text-slate-400">Loading overall stats...</div>;
  if (error) return <div className="p-6 text-red-400">Failed to load overall stats</div>;

  if (!data?.overall) {
    return <div className="p-6 text-slate-400">No overall stats available. Do you own any companies?</div>;
  }

  const { overall, companies } = data;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Gauge className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overall Stats</h1>
          <p className="text-sm text-slate-400">Aggregate view across all your companies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Batches" value={overall.totalBatches} icon={<Factory size={24} />} color="text-emerald-400" bg="from-emerald-500/20 to-emerald-500/5" />
        <StatCard title="Total Stock" value={overall.totalStock} icon={<Package size={24} />} color="text-amber-400" bg="from-amber-500/20 to-amber-500/5" />
        <StatCard title="Total Orders" value={overall.totalOrders} icon={<ShoppingCart size={24} />} color="text-blue-400" bg="from-blue-500/20 to-blue-500/5" />
        <StatCard title="Total Users" value={overall.totalUsers} icon={<Users size={24} />} color="text-violet-400" bg="from-violet-500/20 to-violet-500/5" />
      </div>

      <h2 className="text-xl font-bold text-white mt-10 mb-4 tracking-tight">Breakdown by Company</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((c: any) => (
          <div key={c.id} className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 group">
            <h3 className="text-lg font-bold text-slate-200 mb-5 group-hover:text-white transition-colors">{c.name}</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Batches</p>
                <p className="text-lg font-semibold text-emerald-400">{c.totalBatches}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Stock</p>
                <p className="text-lg font-semibold text-amber-400">{c.totalStock}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Orders</p>
                <p className="text-lg font-semibold text-blue-400">{c.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">Users</p>
                <p className="text-lg font-semibold text-violet-400">{c.totalUsers}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: string | number, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bg} rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500`}></div>
      <div className={`w-12 h-12 rounded-xl bg-slate-900/80 flex items-center justify-center mb-4 ${color} relative z-10 shadow-inner`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-400 relative z-10">{title}</p>
      <h3 className="text-3xl font-bold text-white mt-1 relative z-10 tracking-tight">{value}</h3>
    </div>
  );
}
