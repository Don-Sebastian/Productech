"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Banknote, PackageOpen, Plus, Tag, Layers, FileText, Wallet, History, Calendar, Filter } from "lucide-react";

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateVal: string | Date | undefined | null) {
  if (!dateVal) return "--";
  const d = new Date(dateVal);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Helper: Check if date falls in current week (Monday 00:00 to Sunday 23:59)
function isCurrentWeek(dateVal: string | Date) {
  const d = new Date(dateVal);
  const now = new Date();

  // Monday of current week
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return d >= monday && d <= sunday;
}

function isCurrentMonth(dateVal: string | Date) {
  const d = new Date(dateVal);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function ManagerFinancialsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"MATERIALS" | "PURCHASES" | "EXPENSES">("MATERIALS");

  // Filters for Purchases List
  const [purchaseDateFilter, setPurchaseDateFilter] = useState<"THIS_WEEK" | "THIS_MONTH" | "ALL" | "CUSTOM">("THIS_WEEK");
  const [purchaseCustomStart, setPurchaseCustomStart] = useState("");
  const [purchaseCustomEnd, setPurchaseCustomEnd] = useState("");
  const [purchaseMaterialFilter, setPurchaseMaterialFilter] = useState<string>("ALL");

  // Filters for Expenses List
  const [expenseDateFilter, setExpenseDateFilter] = useState<"THIS_WEEK" | "THIS_MONTH" | "ALL" | "CUSTOM">("THIS_WEEK");
  const [expenseCustomStart, setExpenseCustomStart] = useState("");
  const [expenseCustomEnd, setExpenseCustomEnd] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  // Queries
  const { data: materials = [] } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => fetch("/api/raw-materials").then(res => res.json()),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => fetch("/api/financials/purchases").then(res => res.json()),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetch("/api/financials/expenses").then(res => res.json()),
  });

  // State for forms
  const [materialForm, setMaterialForm] = useState({ name: "", unit: "" });
  const [purchaseForm, setPurchaseForm] = useState({
    materialId: "",
    quantity: "",
    unitPrice: "",
    notes: "",
    purchaseDate: getTodayString(),
  });
  const [expenseForm, setExpenseForm] = useState({ name: "", description: "" });
  const [paymentForm, setPaymentForm] = useState({
    expenseId: "",
    amount: "",
    notes: "",
    paymentDate: getTodayString(),
  });

  // Mutations
  const addMaterial = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      setMaterialForm({ name: "", unit: "" });
    },
  });

  const addPurchase = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/financials/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setPurchaseForm({
        materialId: "",
        quantity: "",
        unitPrice: "",
        notes: "",
        purchaseDate: getTodayString(),
      });
    },
  });

  const addExpense = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/financials/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setExpenseForm({ name: "", description: "" });
    },
  });

  const addPayment = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/financials/expense-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setPaymentForm({
        expenseId: "",
        amount: "",
        notes: "",
        paymentDate: getTodayString(),
      });
    },
  });

  // Filtered Purchases List
  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    return purchases.filter((p: any) => {
      // Material filter
      if (purchaseMaterialFilter !== "ALL" && p.materialId !== purchaseMaterialFilter) return false;

      // Date filter
      if (purchaseDateFilter === "THIS_WEEK") return isCurrentWeek(p.purchaseDate);
      if (purchaseDateFilter === "THIS_MONTH") return isCurrentMonth(p.purchaseDate);
      if (purchaseDateFilter === "CUSTOM") {
        const pDate = new Date(p.purchaseDate);
        if (purchaseCustomStart && pDate < new Date(purchaseCustomStart + "T00:00:00")) return false;
        if (purchaseCustomEnd && pDate > new Date(purchaseCustomEnd + "T23:59:59")) return false;
      }
      return true;
    });
  }, [purchases, purchaseMaterialFilter, purchaseDateFilter, purchaseCustomStart, purchaseCustomEnd]);

  const filteredPurchasesTotal = useMemo(() => {
    return filteredPurchases.reduce((acc: number, p: any) => acc + (p.totalCost || 0), 0);
  }, [filteredPurchases]);

  // Flattened & Filtered Expenses Payments List
  const allPayments = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    const list: any[] = [];
    expenses.forEach((e: any) => {
      e.payments?.forEach((p: any) => {
        list.push({ ...p, expenseName: e.name, expenseId: e.id });
      });
    });
    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [expenses]);

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p: any) => {
      // Type filter
      if (expenseTypeFilter !== "ALL" && p.expenseId !== expenseTypeFilter) return false;

      // Date filter
      if (expenseDateFilter === "THIS_WEEK") return isCurrentWeek(p.paymentDate);
      if (expenseDateFilter === "THIS_MONTH") return isCurrentMonth(p.paymentDate);
      if (expenseDateFilter === "CUSTOM") {
        const pDate = new Date(p.paymentDate);
        if (expenseCustomStart && pDate < new Date(expenseCustomStart + "T00:00:00")) return false;
        if (expenseCustomEnd && pDate > new Date(expenseCustomEnd + "T23:59:59")) return false;
      }
      return true;
    });
  }, [allPayments, expenseTypeFilter, expenseDateFilter, expenseCustomStart, expenseCustomEnd]);

  const filteredPaymentsTotal = useMemo(() => {
    return filteredPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  }, [filteredPayments]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Banknote size={28} className="text-emerald-400" /> Financial Tracking
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage raw materials, purchases, and overhead expenses</p>
          </div>

          <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
            {[
              { key: "MATERIALS", label: "Materials" },
              { key: "PURCHASES", label: "Purchases" },
              { key: "EXPENSES", label: "Expenses" },
            ].map(tab => (
              <button
                key={tab.key}
                id={`tab-${tab.key.toLowerCase()}`}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${
                  activeTab === tab.key
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MATERIALS TAB */}
        {activeTab === "MATERIALS" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PackageOpen size={18} className="text-cyan-400" /> Add Material
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Material Name</label>
                  <input
                    type="text"
                    placeholder="e.g. WOOD, GUM, FACE"
                    value={materialForm.name}
                    onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. TON, KG, SQMTS"
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <button
                  onClick={() => addMaterial.mutate(materialForm)}
                  disabled={!materialForm.name || !materialForm.unit || addMaterial.isPending}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Material
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {materials.length === 0 ? (
                <div className="text-slate-500 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                  No raw materials defined yet.
                </div>
              ) : (
                materials.map((m: any) => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
                        <Layers size={20} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{m.name}</h3>
                        <p className="text-slate-500 text-xs tracking-widest uppercase">Unit: {m.unit}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PURCHASES TAB */}
        {activeTab === "PURCHASES" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Tag size={18} className="text-emerald-400" /> Record Purchase
              </h2>
              <div className="space-y-4">
                {/* Purchase Date Picker */}
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-400" /> Purchase Date
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={e => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500 transition [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Raw Material</label>
                  <select
                    value={purchaseForm.materialId}
                    onChange={e => setPurchaseForm({ ...purchaseForm, materialId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500 transition appearance-none"
                  >
                    <option value="">Select Material...</option>
                    {materials.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={purchaseForm.quantity}
                      onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={purchaseForm.unitPrice}
                      onChange={e => setPurchaseForm({ ...purchaseForm, unitPrice: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Total Cost</label>
                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-emerald-400 font-black">
                    ₹{((parseFloat(purchaseForm.quantity) || 0) * (parseFloat(purchaseForm.unitPrice) || 0)).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Supplier, invoice #, etc."
                    value={purchaseForm.notes}
                    onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  id="btn-save-purchase"
                  onClick={() => addPurchase.mutate(purchaseForm)}
                  disabled={
                    !purchaseForm.materialId ||
                    !purchaseForm.quantity ||
                    !purchaseForm.unitPrice ||
                    parseFloat(purchaseForm.quantity) <= 0 ||
                    parseFloat(purchaseForm.unitPrice) <= 0 ||
                    addPurchase.isPending
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Save Purchase
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Filter Bar with Default Current Week */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <Filter size={14} className="text-emerald-400" /> Filter Purchases
                  </div>
                  <div className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                    {filteredPurchases.length} Records • ₹{filteredPurchasesTotal.toLocaleString()} Total
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                  {/* Date Period Filter */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                      Date Period
                    </label>
                    <select
                      value={purchaseDateFilter}
                      onChange={e => setPurchaseDateFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition"
                    >
                      <option value="THIS_WEEK">Current Week (Default)</option>
                      <option value="THIS_MONTH">Current Month</option>
                      <option value="ALL">All Time</option>
                      <option value="CUSTOM">Custom Date Range</option>
                    </select>
                  </div>

                  {/* Material Filter */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                      Material
                    </label>
                    <select
                      value={purchaseMaterialFilter}
                      onChange={e => setPurchaseMaterialFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition"
                    >
                      <option value="ALL">All Materials (Default)</option>
                      {materials.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {purchaseDateFilter === "CUSTOM" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">From Date</label>
                      <input
                        type="date"
                        value={purchaseCustomStart}
                        onChange={e => setPurchaseCustomStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-emerald-500 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">To Date</label>
                      <input
                        type="date"
                        value={purchaseCustomEnd}
                        onChange={e => setPurchaseCustomEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-emerald-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Purchases List */}
              {filteredPurchases.length === 0 ? (
                <div className="text-slate-500 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                  No purchases found for selected filter.
                </div>
              ) : (
                filteredPurchases.map((p: any) => (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <History size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-bold">{p.material?.name} Purchase</h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-medium flex items-center gap-1">
                            <Calendar size={11} className="text-emerald-400" />
                            {formatDateDisplay(p.purchaseDate)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Logged by {p.createdBy?.name || "Manager"}
                        </p>
                        {p.notes && <p className="text-slate-400 text-xs mt-0.5 italic">{p.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quantity</p>
                        <p className="text-white font-medium">
                          {p.quantity} {p.material?.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rate</p>
                        <p className="text-white font-medium">
                          ₹{p.unitPrice}/{p.material?.unit}
                        </p>
                      </div>
                      <div className="border-l border-slate-800 pl-4">
                        <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-emerald-400 font-black text-lg">₹{p.totalCost?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === "EXPENSES" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-amber-400" /> Define Expense Type
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Expense Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Electricity, Wages, Rent"
                      value={expenseForm.name}
                      onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <button
                    onClick={() => addExpense.mutate(expenseForm)}
                    disabled={!expenseForm.name || addExpense.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Add Type
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet size={18} className="text-amber-400" /> Record Expense Payment
                </h2>
                <div className="space-y-4">
                  {/* Payment Date Picker */}
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-amber-400" /> Expense Date
                    </label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 transition [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Expense Type</label>
                    <select
                      value={paymentForm.expenseId}
                      onChange={e => setPaymentForm({ ...paymentForm, expenseId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 transition appearance-none"
                    >
                      <option value="">Select Expense...</option>
                      {expenses.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Notes / Invoice Ref</label>
                    <input
                      type="text"
                      placeholder="Invoice #, description, etc."
                      value={paymentForm.notes}
                      onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <button
                    onClick={() => addPayment.mutate(paymentForm)}
                    disabled={!paymentForm.expenseId || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || addPayment.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Save Expense
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Filter Bar with Default Current Week */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                    <Filter size={14} className="text-amber-400" /> Filter Expenses
                  </div>
                  <div className="text-xs font-semibold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                    {filteredPayments.length} Records • ₹{filteredPaymentsTotal.toLocaleString()} Total
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                  {/* Date Filter */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                      Date Period
                    </label>
                    <select
                      value={expenseDateFilter}
                      onChange={e => setExpenseDateFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 transition"
                    >
                      <option value="THIS_WEEK">Current Week (Default)</option>
                      <option value="THIS_MONTH">Current Month</option>
                      <option value="ALL">All Time</option>
                      <option value="CUSTOM">Custom Date Range</option>
                    </select>
                  </div>

                  {/* Expense Type Filter */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                      Expense Type
                    </label>
                    <select
                      value={expenseTypeFilter}
                      onChange={e => setExpenseTypeFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500 transition"
                    >
                      <option value="ALL">All Types (Default)</option>
                      {expenses.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {expenseDateFilter === "CUSTOM" && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">From Date</label>
                      <input
                        type="date"
                        value={expenseCustomStart}
                        onChange={e => setExpenseCustomStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-amber-500 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">To Date</label>
                      <input
                        type="date"
                        value={expenseCustomEnd}
                        onChange={e => setExpenseCustomEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-amber-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payments List */}
              {filteredPayments.length === 0 ? (
                <div className="text-slate-500 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                  No expense payments found for selected filter.
                </div>
              ) : (
                filteredPayments.map((p: any) => (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold">{p.expenseName}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-medium flex items-center gap-1">
                          <Calendar size={11} className="text-amber-400" />
                          {formatDateDisplay(p.paymentDate)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Logged by {p.createdBy?.name || "Manager"}
                      </p>
                      {p.notes && <p className="text-slate-400 text-xs mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black text-lg">₹{p.amount?.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ManagerFinancialsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>}>
      <ManagerFinancialsContent />
    </Suspense>
  );
}
