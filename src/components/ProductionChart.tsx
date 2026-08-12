"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2, TrendingUp, Clock, Target, Layers } from "lucide-react";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

export default function ProductionChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-charts-live"],
    queryFn: () => fetch("/api/dashboard/charts").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center backdrop-blur-xl">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="w-full h-96 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-500 backdrop-blur-xl">
        Failed to load production data
      </div>
    );
  }

  const chartData = data[timeRange] || [];
  const metrics = data.metrics || { totalCooks: 0, avgCookTimeMinutes: 0, overallSqft: 0 };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-purple-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-slate-300 font-bold mb-1">{label}</p>
          <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            {payload[0].value.toLocaleString()} sqft
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Level Efficiency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Lifetime Production</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">{metrics.overallSqft.toLocaleString()}</p>
          <p className="text-emerald-400 text-xs font-medium mt-1 relative z-10">Total sqft produced</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Avg Cook Time</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">{metrics.avgCookTimeMinutes} <span className="text-xl text-slate-500 font-medium">min</span></p>
          <p className="text-amber-400 text-xs font-medium mt-1 relative z-10">Efficiency rating</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers size={20} />
            </div>
            <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Total Batches</h3>
          </div>
          <p className="text-3xl font-black text-white relative z-10">{metrics.totalCooks.toLocaleString()}</p>
          <p className="text-blue-400 text-xs font-medium mt-1 relative z-10">Cooked daylights</p>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Target className="text-purple-400" />
              Approved Production History
            </h2>
            <p className="text-slate-400 text-sm mt-1">Sqft output from manager-approved logs</p>
          </div>

          <div className="flex bg-slate-950 rounded-xl p-1 shadow-inner border border-slate-800/80">
            {(["daily", "weekly", "monthly", "yearly"] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${timeRange === tr
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSqft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="sqft"
                stroke="#a855f7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSqft)"
                activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
