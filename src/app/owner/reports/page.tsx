"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import {
  BarChart3, TrendingUp, IndianRupee, PieChart, Activity,
  Calendar, AlertTriangle, ArrowUpRight, ArrowDownRight,
  GitCompare, Zap, Target, TrendingDown, ChevronRight,
} from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip,
  Legend, CartesianGrid, Cell, ReferenceLine, ComposedChart
} from "recharts";
import { formatINR, formatVariance, formatPerUnit, formatNumber } from "@/lib/formatIndian";

// ─── Colour helpers ──────────────────────────────────────────────────────────
function varianceColor(val: number, inverse = false) {
  const bad = inverse ? val < 0 : val > 0;
  if (bad) return "text-rose-400";
  if (val === 0) return "text-slate-400";
  return "text-emerald-400";
}
function varianceBg(val: number) {
  if (val > 0) return "bg-rose-500/10 border-rose-500/30 text-rose-400";
  if (val < 0) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  return "bg-slate-800/50 border-slate-700 text-slate-400";
}
function yieldColor(pct: number | null) {
  if (pct === null) return "text-slate-400";
  if (Math.abs(pct) <= 5) return "text-emerald-400";
  if (Math.abs(pct) <= 15) return "text-amber-400";
  return "text-rose-400";
}
function yieldBg(pct: number | null) {
  if (pct === null) return "bg-slate-800/50 border-slate-700";
  if (Math.abs(pct) <= 5) return "bg-emerald-500/10 border-emerald-500/30";
  if (Math.abs(pct) <= 15) return "bg-amber-500/10 border-amber-500/30";
  return "bg-rose-500/10 border-rose-500/30";
}

// ─── Category Colours ────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "Wood / Timber": "#6366f1",
  "Gum / Resin":   "#f59e0b",
  "Face Veneer":   "#10b981",
  "Core Veneer":   "#06b6d4",
  "Chemicals":     "#ec4899",
  "Others":        "#64748b",
};
function catColor(category: string) {
  return CAT_COLORS[category] || "#94a3b8";
}

const CHART_COLORS = ["#6366f1","#f59e0b","#10b981","#06b6d4","#ec4899","#64748b"];

export default function OwnerReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [dateParam, setDateParam] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState<"actual" | "standard">("actual");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["cost-analysis", dateParam],
    queryFn: () => fetch(`/api/reports/cost-analysis?date=${dateParam}`).then(res => res.json()),
    enabled: status === "authenticated",
  });

  const { data: companySettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => fetch("/api/company/settings").then(res => res.json()),
    enabled: status === "authenticated",
  });

  const costingPreference = companySettings?.costingPreference || "BOTH";

  useEffect(() => {
    if (costingPreference === "ACTUAL") setViewMode("actual");
    if (costingPreference === "STANDARD") setViewMode("standard");
  }, [costingPreference]);

  const handlePrevWeek = () => {
    const d = new Date(dateParam); d.setDate(d.getDate() - 7);
    setDateParam(d.toISOString().split("T")[0]);
  };
  const handleNextWeek = () => {
    const d = new Date(dateParam); d.setDate(d.getDate() + 7);
    setDateParam(d.toISOString().split("T")[0]);
  };

  if (status === "loading" || !session?.user || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const {
    weekLabel = "",
    summary = {} as any,
    materialFractions = [],
    costPerSheetData = [],
    faceData = null,
    actualWeeklyCost = { totalActualMaterialCost: 0, byCategory: [], byMaterial: [] } as any,
    yieldAnalysis = { totalSheetsProduced: 0, byCategory: [] } as any,
    pnlSummary = {} as any,
  } = report || {};

  const isActual = viewMode === "actual";

  // KPI values toggle
  const displayRevenue   = summary.totalRevenue || 0;
  const displayCost      = isActual ? (pnlSummary.actualCostTotal || 0) : (pnlSummary.standardCostTotal || 0);
  const displayProfit    = isActual ? (pnlSummary.actualProfit || 0) : (pnlSummary.standardProfit || 0);
  const displayMarginPct = displayRevenue > 0 ? (displayProfit / displayRevenue) * 100 : 0;

  // Chart data: Actual vs Standard per thickness
  const varianceChartData = costPerSheetData.map((d: any) => ({
    name: d.name,
    "Standard Cost": parseFloat(d.standardTotalCostPerSheet.toFixed(2)),
    "Actual Cost":   parseFloat(d.actualTotalCostPerSheet.toFixed(2)),
    "Variance":      parseFloat(d.totalVariancePerSheet.toFixed(2)),
  }));

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp size={28} className="text-purple-400" /> Cost &amp; Profitability Reports
            </h1>
            <p className="text-slate-400 text-sm mt-1">Weekly analysis · Standard vs Actual cost · Yield &amp; Variance</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Standard / Actual toggle */}
            {costingPreference === "BOTH" && (
              <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
                <button
                  onClick={() => setViewMode("actual")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === "actual" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Actual View
                </button>
                <button
                  onClick={() => setViewMode("standard")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === "standard" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Standard View
                </button>
              </div>
            )}

            {/* Week navigator */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">← Prev</button>
              <div className="px-4 text-sm font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-cyan-400" />
                {weekLabel || "Loading..."}
              </div>
              <button onClick={handleNextWeek} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">Next →</button>
            </div>
          </div>
        </div>

        {/* View mode badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border ${isActual ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400"}`}>
          {isActual ? <Zap size={12} /> : <Target size={12} />}
          {isActual ? "Showing Actual Weekly Purchase-Based Cost" : "Showing Standard BOM-Based Cost"}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-cyan-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        ) : (
          <div className="space-y-8">

            {/* ─────────────────────────── KPIs ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={64} /></div>
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Weekly Production</div>
                <div className="text-2xl font-black text-white">{(summary.totalSheets || 0).toLocaleString()} Sheets</div>
                <div className="text-sm text-cyan-400 font-medium mt-1">
                  {formatNumber(summary.totalSqft)} sqft · {summary.totalSqM?.toLocaleString()} sq.m
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={64} /></div>
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                  {isActual ? "Actual Total Cost" : "Standard Total Cost"}
                </div>
                <div className="text-2xl font-black text-rose-400">{formatINR(displayCost)}</div>
                <div className="text-xs text-rose-400/70 font-medium mt-1">
                  {(summary.totalSheets || 0) > 0 ? formatPerUnit(displayCost / summary.totalSheets) + "/sheet" : "No production"}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={64} /></div>
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Dispatched Revenue</div>
                <div className="text-2xl font-black text-emerald-400">{formatINR(displayRevenue)}</div>
                <div className="text-xs text-emerald-400/70 font-medium mt-1">From dispatches this week</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><PieChart size={64} /></div>
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Net Profit / Loss</div>
                <div className={`text-2xl font-black ${displayProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {displayProfit >= 0 ? "+" : ""}{formatINR(displayProfit)}
                </div>
                <div className={`text-xs font-medium mt-1 ${displayProfit >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                  {displayMarginPct.toFixed(1)}% Margin
                </div>
              </div>
            </div>

            {/* ─── Actual vs Standard Summary Banner ─── */}
            {(pnlSummary.varianceTotal !== undefined) && (
              <div className={`rounded-2xl border p-5 ${pnlSummary.varianceTotal > 0 ? "bg-rose-900/10 border-rose-500/30" : "bg-emerald-900/10 border-emerald-500/30"}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pnlSummary.varianceTotal > 0 ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
                      <GitCompare size={20} className={pnlSummary.varianceTotal > 0 ? "text-rose-400" : "text-emerald-400"} />
                    </div>
                    <div>
                      <p className="text-white font-bold">Standard vs Actual Cost Deviation</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {pnlSummary.varianceTotal > 0
                          ? "⚠️ Actual cost is above standard — production ran over budget this week"
                          : "✅ Actual cost is below standard — production was efficient this week"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Standard Cost</p>
                      <p className="text-lg font-black text-purple-400">{formatINR(pnlSummary.standardCostTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Actual Cost</p>
                      <p className="text-lg font-black text-cyan-400">{formatINR(pnlSummary.actualCostTotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Variance</p>
                      <p className={`text-lg font-black ${pnlSummary.varianceTotal > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {formatVariance(pnlSummary.varianceTotal)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Profit Impact</p>
                      <p className={`text-lg font-black ${(pnlSummary.profitImpact || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatVariance(pnlSummary.profitImpact, { currency: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Phase 3A: Weekly Actual Material Cost ─── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <IndianRupee size={18} className="text-cyan-400" /> Weekly Actual Material Cost
                </h2>
                <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold">
                  {formatINR(actualWeeklyCost.totalActualMaterialCost)} total purchases this week
                </span>
              </div>

              {actualWeeklyCost.byCategory.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm italic">
                  No purchase records found for this week. Record purchases in Financials → Raw Materials.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4">By Category</p>
                    <div className="space-y-3">
                      {actualWeeklyCost.byCategory.map((cat: any) => {
                        const pct = actualWeeklyCost.totalActualMaterialCost > 0
                          ? (cat.spend / actualWeeklyCost.totalActualMaterialCost) * 100 : 0;
                        const color = catColor(cat.category);
                        return (
                          <div key={cat.category}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-slate-200 font-medium">{cat.category}</span>
                                <span className="text-slate-500 text-xs">{cat.materialCount} material{cat.materialCount > 1 ? "s" : ""}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-white font-bold">{formatINR(cat.spend)}</span>
                                <span className="text-slate-500 text-xs ml-2">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Donut-style bar chart by material */}
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4">By Material</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={actualWeeklyCost.byMaterial.slice(0, 8)}
                          layout="vertical"
                          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => formatINR(v)} stroke="#64748b" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" width={90} tick={{ fontSize: 10 }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }}
                            formatter={(v: any) => [formatINR(v, { raw: true }), "Spend"]}
                          />
                          <Bar dataKey="spend" radius={[0, 4, 4, 0]}>
                            {actualWeeklyCost.byMaterial.slice(0, 8).map((m: any, i: number) => (
                              <Cell key={i} fill={catColor(m.category)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Phase 3B: Yield / Recovery Analysis ─── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-emerald-400" /> Yield / Recovery Analysis
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">≤5% — Good</span>
                  <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">5–15% — Watch</span>
                  <span className="px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">&gt;15% — Alert</span>
                </div>
              </div>

              {yieldAnalysis.byCategory.length === 0 ? (
                <p className="text-slate-500 text-sm italic text-center py-6">
                  No purchase data for this week. Yield analysis requires purchase records and BOM specs.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="pb-3 pr-4 font-semibold">Category</th>
                        <th className="pb-3 px-4 font-semibold">Actual Qty Purchased</th>
                        <th className="pb-3 px-4 font-semibold text-purple-400">Standard Qty (BOM)</th>
                        <th className="pb-3 px-4 font-semibold">Actual / Sheet</th>
                        <th className="pb-3 px-4 font-semibold text-purple-400">Standard / Sheet</th>
                        <th className="pb-3 px-4 font-semibold">Variance</th>
                        <th className="pb-3 pl-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yieldAnalysis.byCategory.map((row: any) => (
                        <tr key={row.category} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor(row.category) }} />
                              <span className="text-white font-semibold">{row.category}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-cyan-300 font-medium">
                            {row.actualQty.toFixed(2)} {row.unit}
                          </td>
                          <td className="py-4 px-4 text-purple-300 font-medium">
                            {row.stdQty > 0 ? row.stdQty.toFixed(2) + " " + row.unit : "—"}
                          </td>
                          <td className="py-4 px-4 text-slate-200">
                            {row.actualQtyPerSheet.toFixed(3)} {row.unit}/sheet
                          </td>
                          <td className="py-4 px-4 text-purple-300">
                            {row.stdQtyPerSheet > 0 ? row.stdQtyPerSheet.toFixed(3) + " " + row.unit + "/sheet" : "—"}
                          </td>
                          <td className="py-4 px-4">
                            <span className={row.variancePct !== null ? yieldColor(row.variancePct) : "text-slate-500"}>
                              {row.variancePct !== null
                                ? `${row.varianceQty > 0 ? "+" : ""}${row.varianceQty.toFixed(2)} ${row.unit} (${row.variancePct > 0 ? "+" : ""}${row.variancePct.toFixed(1)}%)`
                                : "No BOM standard"}
                            </span>
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${yieldBg(row.variancePct)}`}>
                              {row.variancePct === null ? "No BOM"
                                : Math.abs(row.variancePct) <= 5 ? "✓ On Track"
                                : Math.abs(row.variancePct) <= 15 ? "⚠ Watch"
                                : "🔴 Over Limit"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── Phase 4: Actual vs Standard Variance per Thickness ─── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <GitCompare size={18} className="text-amber-400" /> Actual vs Standard Variance — Per Thickness
              </h2>
              <p className="text-slate-500 text-xs mb-6">
                Standard = BOM material cost at standard rates. Actual = this week's purchase spend distributed by production. Positive variance = over-budget (adverse).
              </p>

              {costPerSheetData.length === 0 ? (
                <p className="text-slate-500 text-sm italic text-center py-6">No production data for this week.</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="pb-3 pr-4 font-semibold">Thickness</th>
                          <th className="pb-3 px-3 font-semibold">Sheets</th>
                          <th className="pb-3 px-3 font-semibold text-purple-400">Std Mat Cost</th>
                          <th className="pb-3 px-3 font-semibold text-cyan-400">Act Mat Cost</th>
                          <th className="pb-3 px-3 font-semibold text-purple-400">Std OH/Sheet</th>
                          <th className="pb-3 px-3 font-semibold text-cyan-400">Act OH/Sheet</th>
                          <th className="pb-3 px-3 font-semibold text-purple-400">Std Total</th>
                          <th className="pb-3 px-3 font-semibold text-cyan-400">Act Total</th>
                          <th className="pb-3 px-3 font-semibold">Var/Sheet</th>
                          <th className="pb-3 pl-3 font-semibold text-right">Week Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costPerSheetData.map((d: any) => (
                          <tr key={d.thicknessId} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="py-4 pr-4 text-white font-bold text-lg">{d.name}</td>
                            <td className="py-4 px-3 text-slate-300">{d.sheetsProduced.toLocaleString()}</td>
                            <td className="py-4 px-3 text-purple-300 font-medium">{formatPerUnit(d.standardMaterialCostPerSheet)}</td>
                            <td className="py-4 px-3 text-cyan-300 font-medium">{formatPerUnit(d.actualMaterialCostPerSheet)}</td>
                            <td className="py-4 px-3 text-purple-300">{formatPerUnit(d.standardOverheadCostPerSheet)}</td>
                            <td className="py-4 px-3 text-cyan-300">{formatPerUnit(d.actualOverheadCostPerSheet)}</td>
                            <td className="py-4 px-3 text-purple-400 font-bold">{formatPerUnit(d.standardTotalCostPerSheet)}</td>
                            <td className="py-4 px-3 text-cyan-400 font-bold">{formatPerUnit(d.actualTotalCostPerSheet)}</td>
                            <td className="py-4 px-3">
                              <span className={d.totalVariancePerSheet > 0 ? "text-rose-400 font-bold" : d.totalVariancePerSheet < 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                                {formatVariance(d.totalVariancePerSheet, { raw: true })}
                              </span>
                            </td>
                            <td className="py-4 pl-3 text-right">
                              <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${varianceBg(d.totalVarianceWeek)}`}>
                                {formatVariance(d.totalVarianceWeek)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Variance Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={varianceChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#64748b" tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10 }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }}
                          formatter={(v: any, name: any) => [formatPerUnit(v), name]}
                        />
                        <Legend />
                        <Bar dataKey="Standard Cost" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual Cost" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        <ReferenceLine y={0} stroke="#64748b" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            {/* ─── Standard Cost / Actual Cost per Sheet Breakdown (existing table, enhanced) ─── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Activity size={18} className="text-rose-400" />
                {isActual ? "Actual" : "Standard"} Cost Breakdown per Thickness
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-semibold">Thickness</th>
                      <th className="pb-3 px-4 font-semibold">Production</th>
                      <th className="pb-3 px-4 font-semibold text-rose-400">Mat. Cost / Sheet</th>
                      <th className="pb-3 px-4 font-semibold text-rose-400">Overhead / Sheet</th>
                      <th className="pb-3 px-4 font-semibold text-rose-400">Total Cost / sqft</th>
                      <th className="pb-3 px-4 font-semibold text-emerald-400">Avg Sale / sqft</th>
                      <th className="pb-3 pl-4 font-semibold text-right">Margin / sqft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costPerSheetData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">No production data for this week</td>
                      </tr>
                    ) : (
                      costPerSheetData.map((d: any) => {
                        const matCost = isActual ? d.actualMaterialCostPerSheet : d.standardMaterialCostPerSheet;
                        const ohCost  = isActual ? d.actualOverheadCostPerSheet : d.standardOverheadCostPerSheet;
                        const costSqft = isActual ? d.actualCostPerSqft : d.standardCostPerSqft;
                        const margin   = isActual ? d.actualMarginPerSqft : d.standardMarginPerSqft;
                        return (
                          <tr key={d.thicknessId} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                            <td className="py-4 pr-4">
                              <div className="text-white font-bold text-lg">{d.name}</div>
                            </td>
                            <td className="py-4 px-4 text-slate-300">{d.sheetsProduced} shts</td>
                            <td className="py-4 px-4 text-rose-300 font-medium">{formatPerUnit(matCost)}</td>
                            <td className="py-4 px-4 text-rose-300 font-medium">{formatPerUnit(ohCost)}</td>
                            <td className="py-4 px-4 text-white font-bold">{formatPerUnit(costSqft)}</td>
                            <td className="py-4 px-4 text-emerald-300 font-bold">{formatPerUnit(d.avgSalePricePerSqft)}</td>
                            <td className="py-4 pl-4 text-right">
                              <span className={`px-2 py-1 rounded text-xs font-bold border ${varianceBg(-margin)}`}>
                                {margin >= 0 ? "+" : ""}₹{margin.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── Material Weightage + Margin Chart ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <PieChart size={18} className="text-purple-400" /> Material Weightage Distribution
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={materialFractions} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} stroke="#64748b" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{ fontSize: 10 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }}
                        formatter={(val: any) => [`${(val * 100).toFixed(1)}%`, "Weight Fraction"]}
                      />
                      <Bar dataKey="fraction" radius={[0, 4, 4, 0]}>
                        {materialFractions.map((m: any, i: number) => (
                          <Cell key={i} fill={catColor(m.category)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-slate-400 text-xs mt-4 italic text-center">
                  Based on latest raw material purchases. Colour = category.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" /> Margin Analysis (per sqft)
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costPerSheetData.map((d: any) => ({
                      name: d.name,
                      cost: parseFloat((isActual ? d.actualCostPerSqft : d.standardCostPerSqft).toFixed(2)),
                      margin: parseFloat((isActual ? d.actualMarginPerSqft : d.standardMarginPerSqft).toFixed(2)),
                    }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff" }}
                        formatter={(value: any) => [formatPerUnit(value), ""]}
                      />
                      <Legend />
                      <Bar dataKey="cost" name="Cost" fill="#fb7185" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="margin" name="Margin" fill="#34d399" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
