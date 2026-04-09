"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Thermometer, Wind, Factory, Save, CheckCircle } from "lucide-react";

export default function ManagerProductionSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState({ workingHoursPerDay: 8, numHotPresses: 1, pressCapacityPerPress: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/company/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setSettings(d);
          setLoading(false);
        });
    }
  }, [status]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save");
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  // Derived stats
  const totalBoardsPerCycle = settings.numHotPresses * settings.pressCapacityPerPress;

  if (status === "loading" || !session?.user || loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" /></div>;
  }

  return (
    <div className="h-full flex flex-col pt-2">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <Factory size={28} className="text-orange-400" />
          Hot Press Settings
        </h1>
        <p className="text-slate-400 text-sm">Configure press parameters to automatically calculate production & dispatch estimates</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
      {saved && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> Settings saved successfully!
        </div>
      )}

      <div className="space-y-4 max-w-2xl">
        {/* Working hours */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Clock size={22} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">Working Hours Per Day</p>
              <p className="text-slate-400 text-sm mt-0.5">Total hours the hot press machines operate each day</p>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="number"
                  min={1} max={24} step={0.5}
                  value={settings.workingHoursPerDay}
                  onChange={(e) => setSettings((s) => ({ ...s, workingHoursPerDay: parseFloat(e.target.value) || 8 }))}
                  className="w-28 px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-xl text-white text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 text-center"
                />
                <span className="text-slate-400 font-medium">hours / day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Number of hot presses */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Thermometer size={22} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">Number of Hot Press Machines</p>
              <p className="text-slate-400 text-sm mt-0.5">Total active hot press units running simultaneously</p>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="number"
                  min={1} max={20}
                  value={settings.numHotPresses}
                  onChange={(e) => setSettings((s) => ({ ...s, numHotPresses: parseInt(e.target.value) || 1 }))}
                  className="w-28 px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-xl text-white text-lg font-bold outline-none focus:ring-2 focus:ring-orange-500/50 text-center"
                />
                <span className="text-slate-400 font-medium">machine(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity per press */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Wind size={22} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">Boards Per Press Per Cycle (Daylights)</p>
              <p className="text-slate-400 text-sm mt-0.5">Number of plywood boards produced in one cook cycle per machine</p>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="number"
                  min={1} max={50}
                  value={settings.pressCapacityPerPress}
                  onChange={(e) => setSettings((s) => ({ ...s, pressCapacityPerPress: parseInt(e.target.value) || 10 }))}
                  className="w-28 px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-xl text-white text-lg font-bold outline-none focus:ring-2 focus:ring-cyan-500/50 text-center"
                />
                <span className="text-slate-400 font-medium">boards / cycle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-5">
          <p className="text-orange-300 font-bold text-sm uppercase tracking-widest mb-3">📊 Capacity Summary</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Total boards/cycle</p>
              <p className="text-white font-black text-2xl">{totalBoardsPerCycle}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide">Working hours/day</p>
              <p className="text-white font-black text-2xl">{settings.workingHoursPerDay}h</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            ℹ️ Cooking &amp; cooling times per thickness are set in the <span className="text-blue-400 font-semibold">Product Catalog → Thickness</span> tab.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
