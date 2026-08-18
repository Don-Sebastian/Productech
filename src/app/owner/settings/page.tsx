"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Settings, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function OwnerSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const [rates, setRates] = useState<any[]>([]);
  const [budget, setBudget] = useState({ budgetedMonthlyOverhead: 0, budgetedMonthlySheets: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: fetchedRates, isLoading: isLoadingRates } = useQuery({
    queryKey: ["standard-rates"],
    queryFn: () => fetch("/api/settings/standard-rates").then(res => res.json()),
    enabled: status === "authenticated",
  });

  const { data: fetchedBudget, isLoading: isLoadingBudget } = useQuery({
    queryKey: ["budget"],
    queryFn: () => fetch("/api/settings/budget").then(res => res.json()),
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (fetchedRates && Array.isArray(fetchedRates)) {
      setRates(fetchedRates);
    }
  }, [fetchedRates]);

  useEffect(() => {
    if (fetchedBudget && !fetchedBudget.error) {
      setBudget({
        budgetedMonthlyOverhead: fetchedBudget.budgetedMonthlyOverhead || 0,
        budgetedMonthlySheets: fetchedBudget.budgetedMonthlySheets || 0,
      });
    }
  }, [fetchedBudget]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const resRates = await fetch("/api/settings/standard-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates }),
      });
      if (!resRates.ok) throw new Error("Failed to save standard rates");

      const resBudget = await fetch("/api/settings/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budget),
      });
      if (!resBudget.ok) throw new Error("Failed to save budget settings");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-rates"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || "Failed to save settings");
    }
  });

  if (status === "loading" || isLoadingRates || isLoadingBudget || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
      </div>
    );
  }

  const handleRateChange = (materialId: string, val: string) => {
    setRates(rates.map(r => r.materialId === materialId ? { ...r, standardPrice: val } : r));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      <Sidebar user={session.user} />
      <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Settings className="text-cyan-400" />
                Financial Settings
              </h1>
              <p className="text-slate-400 text-sm mt-1">Configure standard costs and budgets for variance reporting</p>
            </div>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-cyan-900/30"
            >
              {saveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>

          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Settings saved successfully!</p>
                <p className="text-xs text-emerald-400/80">Standard rates and monthly budget have been updated for all variance reports.</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Error saving settings</p>
                <p className="text-xs text-rose-400/80">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Standard Material Rates */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Standard Material Rates</h2>
              <p className="text-sm text-slate-400 mb-6">Set the expected benchmark price for each material.</p>
              
              <div className="space-y-4">
                {rates.map(rate => (
                  <div key={rate.materialId} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                    <div>
                      <p className="text-white font-medium">{rate.name}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Per {rate.unit}</p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rate.standardPrice}
                        onChange={(e) => handleRateChange(rate.materialId, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white w-32 text-right focus:border-cyan-500 outline-none transition"
                      />
                    </div>
                  </div>
                ))}
                {rates.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No raw materials configured yet.</p>
                )}
              </div>
            </div>

            {/* Production & Overhead Budget */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="text-lg font-bold text-white mb-4">Monthly Budget Targets</h2>
              <p className="text-sm text-slate-400 mb-6">Used to calculate standard overhead absorption per sheet.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Budgeted Monthly Overhead (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={budget.budgetedMonthlyOverhead}
                      onChange={(e) => setBudget({ ...budget, budgetedMonthlyOverhead: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white focus:border-cyan-500 outline-none transition"
                      placeholder="e.g. 300000"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Total expected fixed costs (wages, rent, standard power, etc.)</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Target Monthly Production (Sheets)</label>
                  <input
                    type="number"
                    min="0"
                    value={budget.budgetedMonthlySheets}
                    onChange={(e) => setBudget({ ...budget, budgetedMonthlySheets: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition"
                    placeholder="e.g. 5000"
                  />
                  <p className="text-xs text-slate-500 mt-2">Expected total sheets produced in a normal month</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                  <p className="text-sm text-slate-400">Standard Overhead per Sheet</p>
                  <p className="text-2xl font-black text-cyan-400 mt-1">
                    ₹{budget.budgetedMonthlySheets > 0 ? (budget.budgetedMonthlyOverhead / budget.budgetedMonthlySheets).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
