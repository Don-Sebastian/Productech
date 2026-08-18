"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, Wallet, FileText,
  Activity, ChevronDown, Layers, AlertTriangle,
} from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

function KpiCard({
  label, value, sub, icon: Icon, color, glow,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
  glow: string;
}) {
  return (
    <div className={`bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${glow} rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700`} />
      <div className="flex items-center gap-3 mb-2 relative z-10">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        <h3 className="text-slate-400 text-sm font-semibold tracking-wide uppercase">{label}</h3>
      </div>
      <p className="text-3xl font-black text-white relative z-10">{value}</p>
      <p className={`text-xs font-medium mt-1 relative z-10 text-slate-400`}>{sub}</p>
    </div>
  );
}

export default function FinancialDashboard() {
  const [selectedMaterial, setSelectedMaterial] = useState<string>("__ALL__");

  const { data, isLoading } = useQuery({
    queryKey: ["owner-financials"],
    queryFn: () => fetch("/api/dashboard/financials").then((res) => res.json()),
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
      <div className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center text-slate-500 backdrop-blur-xl mt-8 text-center px-8">
        Financial data unavailable — ensure you have dispatched orders and material purchases recorded.
      </div>
    );
  }

  const revenue = data.revenue ?? 0;
  const cogs = data.cogs ?? 0;
  const overhead = data.overhead ?? 0;
  const netProfit = data.netProfit ?? 0;
  const chartData: any[] = data.chartData ?? [];
  const materialNames: string[] = data.materialNames ?? [];
  const financialsOverviewData: any[] = data.financialsOverviewData ?? [];
  const expenseChartData: any[] = data.expenseChartData ?? [];
  const expenseNames: string[] = data.expenseNames ?? [];
  const faceWastage = data.faceWastage ?? null;

  const isProfitable = netProfit >= 0;

  // Filter raw material chart data to selected material only
  const filteredMaterialNames = selectedMaterial === "__ALL__" ? materialNames : [selectedMaterial];
  const filteredChartData = chartData.map((row) => {
    if (selectedMaterial === "__ALL__") return row;
    const filtered: any = { date: row.date };
    if (row[selectedMaterial] !== undefined) filtered[selectedMaterial] = row[selectedMaterial];
    return filtered;
  });

  return (
    <div className="space-y-8 mt-12 mb-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
          <Activity className="text-emerald-400" />
          Financial Overview
        </h2>
        <p className="text-slate-400 text-sm">
          Real-time P&amp;L based on dispatches, raw material costs, and overhead.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={`₹${revenue.toLocaleString()}`} sub="Sales from dispatches" icon={DollarSign} color="bg-cyan-500/20 text-cyan-400" glow="bg-cyan-500/10" />
        <KpiCard label="COGS" value={`₹${cogs.toLocaleString()}`} sub="Raw Material Purchases" icon={Wallet} color="bg-amber-500/20 text-amber-400" glow="bg-amber-500/10" />
        <KpiCard label="Overhead" value={`₹${overhead.toLocaleString()}`} sub="Wages, Electricity, etc." icon={FileText} color="bg-rose-500/20 text-rose-400" glow="bg-rose-500/10" />
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

      {/* Face Wastage Card — shown only if face material is configured */}
      {faceWastage && (
        <div className={`border rounded-2xl p-5 relative overflow-hidden ${faceWastage.wastagePercent > 20 ? "bg-red-900/10 border-red-500/30" : "bg-violet-900/10 border-violet-500/30"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className={faceWastage.wastagePercent > 20 ? "text-red-400" : "text-violet-400"} />
              <h3 className="text-white font-bold">Face Material Usage — {faceWastage.faceMaterialName}</h3>
            </div>
            {faceWastage.wastagePercent > 20 && (
              <span className="text-[11px] px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex items-center gap-1 animate-pulse">
                <AlertTriangle size={11} /> High Wastage
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{faceWastage.faceUsedSqM.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Face Used (sq.m)</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{faceWastage.facePurchasedSqM.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Face Purchased ({faceWastage.faceMaterialUnit})</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${faceWastage.wastagePercent > 20 ? "text-red-400" : "text-emerald-400"}`}>
                {faceWastage.wastagePercent.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Wastage %</p>
            </div>
          </div>
          {/* Wastage bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Utilized</span>
              <span>{(100 - faceWastage.wastagePercent).toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100 - faceWastage.wastagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCIALS OVERVIEW CHART (full width) */}
      <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Financials Overview</h3>
        <p className="text-slate-500 text-xs mb-6">Monthly revenue vs costs for the last 6 months</p>
        {financialsOverviewData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-500">No data for the last 6 months.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialsOverviewData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCogs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOvhd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "16px" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRev)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="cogs" name="COGS" stroke="#f59e0b" strokeWidth={2} fill="url(#gradCogs)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="overhead" name="Overhead" stroke="#ef4444" strokeWidth={2} fill="url(#gradOvhd)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── BOTTOM ROW: Raw Material Trends (compact, filtered) + Expenses History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Raw Material Price Trends — compact with filter */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Raw Material Price Trends</h3>
              <p className="text-slate-500 text-xs mt-0.5">Unit price per purchase date</p>
            </div>
            {materialNames.length > 0 && (
              <div className="relative">
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="__ALL__">All Materials</option>
                  {materialNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
          {filteredChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No purchase history.</div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px" }} itemStyle={{ fontWeight: "bold" }} />
                  {filteredMaterialNames.map((name, idx) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expenses History — by month */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Expenses History</h3>
            <p className="text-slate-500 text-xs mt-0.5">Monthly expense payments by category</p>
          </div>
          {expenseChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No expense payments recorded.</div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px" }}
                    formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "12px" }} />
                  {expenseNames.map((name, idx) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      stackId="expenses"
                      fill={COLORS[(idx + 2) % COLORS.length]}
                      radius={idx === expenseNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
