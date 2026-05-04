"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
  Package,
  AlertTriangle,
  Check,
  Loader2,
  History,
  Edit3,
} from "lucide-react";

interface GlueStockLog {
  id: string;
  type: string;
  quantityKg: number;
  balanceKg: number;
  notes: string | null;
  createdAt: string;
}

interface GlueStockData {
  id: string;
  currentKg: number;
  openingKg: number;
  updatedAt: string;
  logs: GlueStockLog[];
}

export default function GlueStockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stock, setStock] = useState<GlueStockData | null>(null);
  const [thresholdKg, setThresholdKg] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form states
  const [openingKg, setOpeningKg] = useState("");
  const [addKg, setAddKg] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [adjustKg, setAdjustKg] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/glue-stock");
      if (res.ok) {
        const data = await res.json();
        setStock(data.stock);
        setThresholdKg(data.thresholdKg);
        setNewThreshold(String(data.thresholdKg));
      }
    } catch {
      console.error("Failed to fetch glue stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status]);

  const handleAction = async (action: string, payload: any) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/glue-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(
          action === "setOpening" ? "Opening stock set successfully!" :
          action === "addStock" ? "Stock added successfully!" :
          action === "adjust" ? "Stock adjusted successfully!" :
          action === "setThreshold" ? "Alert threshold updated!" : "Done!"
        );
        setOpeningKg("");
        setAddKg("");
        setAddNotes("");
        setAdjustKg("");
        setAdjustNotes("");
        setShowAdjust(false);
        fetchData();
      } else {
        setError(data.error || "Failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => { setSuccess(""); setError(""); }, 3000);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const currentBarrels = stock ? (stock.currentKg / 125) : 0;
  const isLow = stock ? stock.currentKg < thresholdKg : false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Droplets className="text-cyan-400" size={28} />
          Glue Stock Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Track and manage glue inventory. Operators use glue in barrels (1 barrel = 125 kg).
        </p>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
          <Check size={16} className="text-emerald-400" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Current Stock Card */}
      <div className={`rounded-2xl p-6 border ${isLow ? "bg-red-900/20 border-red-500/30" : "bg-slate-800/40 border-slate-700/50"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package size={18} className={isLow ? "text-red-400" : "text-cyan-400"} />
            Current Stock
          </h2>
          {isLow && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <AlertTriangle size={12} /> LOW STOCK
            </span>
          )}
        </div>

        {stock ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${isLow ? "text-red-400" : "text-cyan-400"}`}>
                {stock.currentKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-slate-500">Kilograms</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${isLow ? "text-red-400" : "text-emerald-400"}`}>
                {currentBarrels.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-slate-500">Barrels</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">
                {stock.openingKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-slate-500">Opening (kg)</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-400">
                {thresholdKg.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">Alert Threshold</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 rounded-xl p-6 text-center">
            <Droplets size={40} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No glue stock record yet. Set your opening stock below.</p>
          </div>
        )}
      </div>

      {/* Set Opening Stock (if no stock exists) OR Add Stock */}
      {!stock ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-emerald-400" />
            Set Opening Stock
          </h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1.5 font-medium">Quantity (kg)</label>
              <input
                type="number"
                value={openingKg}
                onChange={(e) => setOpeningKg(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                placeholder="e.g. 5000"
                min="0"
                step="0.1"
              />
              {openingKg && (
                <p className="text-xs text-slate-500 mt-1">= {(parseFloat(openingKg) / 125).toFixed(1)} barrels</p>
              )}
            </div>
            <button
              onClick={() => handleAction("setOpening", { quantityKg: parseFloat(openingKg) })}
              disabled={saving || !openingKg || parseFloat(openingKg) <= 0}
              className="self-start mt-7 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Set
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Add Stock */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              Add Glue Stock
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Quantity (kg)</label>
                <input
                  type="number"
                  value={addKg}
                  onChange={(e) => setAddKg(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="e.g. 1000"
                  min="0"
                  step="0.1"
                />
                {addKg && (
                  <p className="text-xs text-slate-500 mt-1">= {(parseFloat(addKg) / 125).toFixed(1)} barrels</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Notes (optional)</label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="e.g. New shipment from supplier"
                />
              </div>
              <button
                onClick={() => handleAction("addStock", { quantityKg: parseFloat(addKg), notes: addNotes })}
                disabled={saving || !addKg || parseFloat(addKg) <= 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add Stock
              </button>
            </div>
          </div>

          {/* Adjust / Set Opening / Threshold */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-amber-400" />
              Settings
            </h2>
            <div className="space-y-4">
              {/* Alert Threshold */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Low Stock Alert Threshold (kg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                    min="0"
                    step="1"
                  />
                  <button
                    onClick={() => handleAction("setThreshold", { thresholdKg: parseFloat(newThreshold) })}
                    disabled={saving || !newThreshold || parseFloat(newThreshold) === thresholdKg}
                    className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Manager and Owner will be notified when stock drops below this level</p>
              </div>

              {/* Adjust Stock */}
              <div className="border-t border-slate-700/50 pt-4">
                <button
                  onClick={() => { setShowAdjust(!showAdjust); setAdjustKg(String(stock?.currentKg || 0)); }}
                  className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition"
                >
                  <Edit3 size={14} /> Manual Stock Adjustment
                </button>
                {showAdjust && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1.5 font-medium">New Stock Value (kg)</label>
                      <input
                        type="number"
                        value={adjustKg}
                        onChange={(e) => setAdjustKg(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1.5 font-medium">Reason</label>
                      <input
                        type="text"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="e.g. Physical count correction"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction("adjust", { newQuantityKg: parseFloat(adjustKg), notes: adjustNotes })}
                        disabled={saving || !adjustKg}
                        className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-30 text-sm"
                      >
                        Confirm Adjustment
                      </button>
                      <button
                        onClick={() => setShowAdjust(false)}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl transition text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Opening Stock */}
              <div className="border-t border-slate-700/50 pt-4">
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">Reset Opening Stock (kg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={openingKg}
                    onChange={(e) => setOpeningKg(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="New opening stock"
                    min="0"
                    step="0.1"
                  />
                  <button
                    onClick={() => handleAction("setOpening", { quantityKg: parseFloat(openingKg) })}
                    disabled={saving || !openingKg || parseFloat(openingKg) <= 0}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">This will reset both opening and current stock to the specified value</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock History Log */}
      {stock && stock.logs && stock.logs.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <History size={18} className="text-blue-400" />
              Stock History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700/50 text-xs">
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-right py-3 px-4">Change</th>
                  <th className="text-right py-3 px-4">Balance</th>
                  <th className="text-left py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {stock.logs.map((log) => {
                  const isAdd = log.quantityKg > 0;
                  const typeConfig: Record<string, { label: string; color: string }> = {
                    OPENING: { label: "Opening", color: "text-blue-400" },
                    ADD: { label: "Added", color: "text-emerald-400" },
                    DEDUCTION: { label: "Used", color: "text-red-400" },
                    ADJUSTMENT: { label: "Adjusted", color: "text-amber-400" },
                  };
                  const tc = typeConfig[log.type] || { label: log.type, color: "text-slate-400" };
                  return (
                    <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className={`py-2.5 px-4 font-bold text-xs ${tc.color}`}>{tc.label}</td>
                      <td className={`py-2.5 px-4 text-right font-bold text-xs ${isAdd ? "text-emerald-400" : "text-red-400"}`}>
                        {isAdd ? "+" : ""}{log.quantityKg.toFixed(1)} kg
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-medium text-xs">
                        {log.balanceKg.toFixed(1)} kg
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500 max-w-[200px] truncate">{log.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
