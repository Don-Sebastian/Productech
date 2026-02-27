"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Send, CheckCircle, Clock, AlertTriangle, Package } from "lucide-react";

export default function PressOperatorProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [dailyLog, setDailyLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add entry state
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(0); // 0=cat, 1=thick, 2=size, 3=qty
  const [selCat, setSelCat] = useState<string | null>(null);
  const [selThick, setSelThick] = useState<number | null>(null);
  const [selProduct, setSelProduct] = useState<any>(null);
  const [selQty, setSelQty] = useState("10");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    Promise.all([
      fetch("/api/company-products").then((r) => r.json()),
      fetch("/api/production-entries").then((r) => r.json()),
    ]).then(([p, e]) => {
      if (Array.isArray(p)) setProducts(p.filter((x: any) => x.isActive));
      if (e.entries) setEntries(e.entries);
      if (e.dailyLog) setDailyLog(e.dailyLog);
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  // Get unique categories and thicknesses from products
  const categories = [...new Map(products.map((p) => [p.category?.name, p.category])).values()];
  const getThicknesses = (catName: string) => {
    const filtered = products.filter((p) => p.category?.name === catName);
    return [...new Map(filtered.map((p) => [p.thickness?.value, p.thickness])).values()];
  };
  const getSizes = (catName: string, thickVal: number) => {
    return products.filter((p) => p.category?.name === catName && p.thickness?.value === thickVal);
  };

  const resetAdd = () => {
    setAddStep(0); setSelCat(null); setSelThick(null); setSelProduct(null); setSelQty("10");
  };

  const addEntry = async () => {
    if (!selProduct || !selQty || parseInt(selQty) <= 0) return;
    setError("");
    try {
      const res = await fetch("/api/production-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selProduct.id, quantity: selQty }),
      });
      if (res.ok) {
        setSuccess("Entry added!");
        setShowAdd(false);
        resetAdd();
        fetchData();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/production-entries?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const submitForApproval = async () => {
    if (entries.length === 0) { setError("No entries to submit"); return; }
    setError("");
    try {
      const res = await fetch("/api/daily-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (res.ok) {
        setSuccess("Submitted for supervisor approval!");
        fetchData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400" /></div>;
  }

  // Can't add if already submitted (and not rejected)
  const isSubmitted = dailyLog && !["PENDING", "REJECTED"].includes(dailyLog.status);
  const totalToday = entries.reduce((sum, e) => sum + e.quantity, 0);

  const qtyPresets = [5, 10, 20, 30, 50, 100];

  const statusColors: Record<string, { text: string; bg: string; label: string }> = {
    PENDING: { text: "text-slate-300", bg: "bg-slate-500/20", label: "Not Submitted" },
    SUBMITTED: { text: "text-amber-300", bg: "bg-amber-500/20", label: "Waiting for Supervisor" },
    SUPERVISOR_APPROVED: { text: "text-blue-300", bg: "bg-blue-500/20", label: "Waiting for Manager" },
    MANAGER_APPROVED: { text: "text-emerald-300", bg: "bg-emerald-500/20", label: "Approved ✓" },
    REJECTED: { text: "text-red-300", bg: "bg-red-500/20", label: "Rejected — Re-submit" },
  };

  const currentStatus = dailyLog?.status || "PENDING";
  const sc = statusColors[currentStatus];

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Daily Production</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Status Banner */}
        <div className={`p-4 ${sc.bg} border border-slate-700/30 rounded-2xl mb-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {currentStatus === "MANAGER_APPROVED" ? <CheckCircle size={20} className="text-emerald-400" /> :
             currentStatus === "REJECTED" ? <AlertTriangle size={20} className="text-red-400" /> :
             <Clock size={20} className={sc.text} />}
            <div>
              <p className={`${sc.text} font-bold text-sm`}>{sc.label}</p>
              <p className="text-slate-400 text-xs">Today&apos;s entries: {entries.length} • Total: {totalToday} sheets</p>
            </div>
          </div>
        </div>

        {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-semibold">✓ {success}</div>}
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}

        {/* Add Entry Button */}
        {!isSubmitted && (
          <button onClick={() => { setShowAdd(true); resetAdd(); }}
            className="w-full mb-4 py-4 rounded-xl bg-rose-600/20 border-2 border-dashed border-rose-500/40 text-rose-400 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-rose-600/30 active:scale-[0.98] transition">
            <Plus size={22} /> Add Production Entry
          </button>
        )}

        {/* Add Entry Flow */}
        {showAdd && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-4">
            <p className="text-rose-300 font-semibold text-sm mb-3">
              {addStep === 0 ? "➊ Select Category" : addStep === 1 ? "➋ Select Thickness" : addStep === 2 ? "➌ Select Size" : "➍ Enter Quantity"}
            </p>

            {/* Step 0: Category */}
            {addStep === 0 && (
              <div className="grid grid-cols-3 gap-2">
                {categories.map((c: any) => (
                  <button key={c?.name} onClick={() => { setSelCat(c?.name); setAddStep(1); }}
                    className="py-4 bg-slate-700 hover:bg-rose-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-base">{c?.name}</button>
                ))}
              </div>
            )}

            {/* Step 1: Thickness */}
            {addStep === 1 && selCat && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Category: <span className="text-white">{selCat}</span></p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {getThicknesses(selCat).map((t: any) => (
                    <button key={t?.value} onClick={() => { setSelThick(t?.value); setAddStep(2); }}
                      className="py-3 bg-slate-700 hover:bg-rose-600 text-white font-bold rounded-xl transition active:scale-[0.95] text-lg">
                      {t?.value}<span className="text-xs opacity-60">mm</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAddStep(0); setSelCat(null); }} className="mt-2 text-sm text-slate-400">← Back</button>
              </div>
            )}

            {/* Step 2: Size */}
            {addStep === 2 && selCat && selThick && (
              <div>
                <p className="text-xs text-slate-400 mb-2">{selCat} • <span className="text-white">{selThick}mm</span></p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {getSizes(selCat, selThick).map((p: any) => (
                    <button key={p.id} onClick={() => { setSelProduct(p); setAddStep(3); }}
                      className="py-3 bg-slate-700 hover:bg-rose-600 text-white font-bold rounded-xl transition active:scale-[0.95]">
                      {p.size?.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAddStep(1); setSelThick(null); }} className="mt-2 text-sm text-slate-400">← Back</button>
              </div>
            )}

            {/* Step 3: Quantity */}
            {addStep === 3 && selProduct && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  {selCat} • {selThick}mm • <span className="text-white font-bold">{selProduct.size?.label}</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {qtyPresets.map((q) => (
                    <button key={q} onClick={() => setSelQty(String(q))}
                      className={`py-3 rounded-xl font-bold transition active:scale-[0.95] ${
                        selQty === String(q) ? "bg-rose-600 text-white" : "bg-slate-700 text-slate-300"
                      }`}>{q}</button>
                  ))}
                </div>
                <input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white text-lg outline-none focus:ring-2 focus:ring-rose-500/50"
                  placeholder="Custom quantity" />
                <div className="flex gap-2">
                  <button onClick={addEntry} className="flex-1 py-3.5 bg-rose-600 text-white font-bold rounded-xl active:scale-[0.97] transition">
                    + Add {selQty} sheets
                  </button>
                  <button onClick={() => { setAddStep(2); setSelProduct(null); }} className="px-4 bg-slate-700 text-slate-300 rounded-xl">←</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Entries List */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No entries today</p>
            <p className="text-slate-500 text-sm">Tap &quot;Add Production Entry&quot; to start logging</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {entries.map((e) => (
              <div key={e.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-rose-300 font-bold text-sm">{e.quantity}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {e.product?.category?.name} • {e.product?.thickness?.value}mm • {e.product?.size?.label}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(e.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                {!isSubmitted && (
                  <button onClick={() => deleteEntry(e.id)} className="p-2 text-slate-500 hover:text-red-400 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        {!isSubmitted && entries.length > 0 && (
          <button onClick={submitForApproval}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg active:scale-[0.97] transition flex items-center justify-center gap-2">
            <Send size={20} /> Submit for Approval ({entries.length} entries, {totalToday} sheets)
          </button>
        )}
      </main>
    </div>
  );
}
