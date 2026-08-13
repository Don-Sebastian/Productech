"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Wallet, FileText, Activity } from "lucide-react";

export default function FinancialDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["owner-financials"],
    queryFn: () => fetch("/api/dashboard/financials").then(res => res.json()),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center backdrop-blur-xl mt-8">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="w-full h-96 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-500 backdrop-blur-xl mt-8">
        Failed to load financial data. Ensure you have MANAGER_APPROVED dispatches and material purchases.
      </div>
    );
  }

  const revenue = data.revenue ?? 0;
  const cogs = data.cogs ?? 0;
  const overhead = data.overhead ?? 0;
  const netProfit = data.netProfit ?? 0;
  const chartData = data.chartData ?? [];
  const materialNames = data.materialNames ?? [];

  const isProfitable = netProfit >= 0;
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-8 mt-12 mb-8">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
          <Activity className="text-emerald-400" />
          Profit & Loss Statement
        </h2>
        <p className="text-slate-400 text-sm">Real-time financial tracking based on material costs and dispatch sales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400"><DollarSign size={20} /></div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Revenue</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">₹{revenue.toLocaleString()}</p>
          <p className="text-cyan-400 text-xs font-medium mt-1 relative z-10">Sales from dispatches</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400"><Wallet size={20} /></div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">COGS</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">₹{cogs.toLocaleString()}</p>
          <p className="text-amber-400 text-xs font-medium mt-1 relative z-10">Raw Material Purchases</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400"><FileText size={20} /></div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Overhead</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">₹{overhead.toLocaleString()}</p>
          <p className="text-rose-400 text-xs font-medium mt-1 relative z-10">Wages, Electricity, etc.</p>
        </div>

        <div className={`bg-gradient-to-br from-slate-900/90 to-slate-950/90 border ${isProfitable ? "border-emerald-500/50" : "border-red-500/50"} rounded-2xl p-5 shadow-lg relative overflow-hidden group`}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${isProfitable ? "bg-emerald-500/10" : "bg-red-500/10"} rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700`} />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-xl ${isProfitable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"} flex items-center justify-center`}>
              {isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Net Profit</h3>
          </div>
          <p className={`text-3xl font-black relative z-10 ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
            {isProfitable ? "+" : ""}₹{netProfit.toLocaleString()}
          </p>
          <p className={`text-xs font-medium mt-1 relative z-10 ${isProfitable ? "text-emerald-500" : "text-red-500"}`}>Overall Margin</p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <h3 className="text-lg font-bold text-white mb-6">Raw Material Price Trends</h3>
        
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-500">No purchase history available.</div>
        ) : (
          <div className="h-[400px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                {materialNames.map((name: string, idx: number) => (
                  <Line 
                    key={name} 
                    type="monotone" 
                    dataKey={name} 
                    name={name}
                    stroke={colors[idx % colors.length]} 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
