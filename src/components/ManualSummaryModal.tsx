"use client";

import { useState, useEffect } from "react";
import { XCircle, Plus, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";

interface ManualSummaryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualSummaryModal({ onClose, onSuccess }: ManualSummaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [operatorId, setOperatorId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [glueBarrels, setGlueBarrels] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [confirmMultiple, setConfirmMultiple] = useState(false);

  // For item builder
  const [selCat, setSelCat] = useState("");
  const [selThick, setSelThick] = useState("");
  const [selSize, setSelSize] = useState("");
  const [selQty, setSelQty] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/users?role=OPERATOR").then((r) => r.json()),
      fetch("/api/machines").then((r) => r.json()),
      fetch("/api/company-products").then((r) => r.json()),
    ]).then(([ops, machs, prods]) => {
      setOperators(Array.isArray(ops) ? ops : []);
      setMachines(Array.isArray(machs) ? machs : []);
      setProducts(Array.isArray(prods) ? prods.filter((p: any) => p.isActive) : []);
      setLoading(false);
    });
  }, []);

  const categories = [...new Map(products.map((p) => [p.category?.name, p.category])).values()].filter(Boolean);
  
  const getThicknesses = (catId: string) => {
    return [...new Map(products.filter((p) => p.categoryId === catId).map((p) => [p.thickness?.value, p.thickness])).values()].filter(Boolean);
  };
  
  const getSizes = (catId: string, thickId: string) => {
    return products.filter((p) => p.categoryId === catId && p.thicknessId === thickId).map((p) => p.size).filter(Boolean);
  };

  const handleAddItem = () => {
    if (!selCat || !selThick || !selSize || !selQty) return;
    const cat = categories.find((c) => c.id === selCat);
    const thick = getThicknesses(selCat).find((t) => t.id === selThick);
    const size = getSizes(selCat, selThick).find((s) => s.id === selSize);
    
    setItems([
      ...items,
      {
        categoryId: selCat,
        categoryName: cat?.name,
        thicknessId: selThick,
        thicknessValue: thick?.value,
        sizeId: selSize,
        sizeLabel: size?.label,
        quantity: selQty,
      },
    ]);
    setSelCat("");
    setSelThick("");
    setSelSize("");
    setSelQty("");
  };

  const handleSubmit = async () => {
    if (!shiftDate || !operatorId || !machineId || items.length === 0) {
      setError("Please fill all required fields and add at least one item");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/hotpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "manualSummary",
        shiftDate,
        operatorId,
        machineId,
        items,
        glueBarrels,
        notes,
        confirmMultiple,
      }),
    });

    if (res.ok) {
      onSuccess();
    } else {
      const err = await res.json();
      if (err.error === "duplicate_warning") {
        setDuplicateWarning(err.message);
        setConfirmMultiple(false);
      } else {
        setError(err.error || "Submission failed");
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full my-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">New Manual Summary</h2>
            <p className="text-sm text-slate-400">Directly adds stock to inventory</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <XCircle size={20} />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-sm">{error}</div>}
        
        {duplicateWarning && (
          <div className="mb-4 p-4 bg-orange-900/30 border border-orange-700/50 rounded-xl">
            <p className="text-orange-400 text-sm font-bold flex items-center gap-2 mb-3">
              <AlertTriangle size={16} /> Warning: Duplicate Summary Detected
            </p>
            <p className="text-slate-300 text-sm mb-3">{duplicateWarning}</p>
            <label className="flex items-center gap-2 text-sm text-white font-bold cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <input type="checkbox" checked={confirmMultiple} onChange={(e) => setConfirmMultiple(e.target.checked)} className="w-5 h-5 rounded border-slate-600 bg-slate-900" />
              Yes, I am sure I want to submit another summary for this date and operator.
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Date</label>
            <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Operator</label>
            <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none">
              <option value="">Select Operator</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Machine</label>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none">
              <option value="">Select Machine</option>
              {machines
                .filter((m) => m.section?.slug === "hotpress" || !m.section)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-white mb-3">Add Production Item</h3>
          <div className="flex gap-2 mb-3">
            <select value={selCat} onChange={(e) => { setSelCat(e.target.value); setSelThick(""); setSelSize(""); }} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none">
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={selThick} onChange={(e) => { setSelThick(e.target.value); setSelSize(""); }} disabled={!selCat} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none disabled:opacity-50">
              <option value="">Thickness</option>
              {selCat && getThicknesses(selCat).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.value}mm
                </option>
              ))}
            </select>
            <select value={selSize} onChange={(e) => setSelSize(e.target.value)} disabled={!selThick} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none disabled:opacity-50">
              <option value="">Size</option>
              {selThick && getSizes(selCat, selThick).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input type="number" placeholder="Qty" value={selQty} onChange={(e) => setSelQty(e.target.value)} className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none" />
            <button onClick={handleAddItem} disabled={!selCat || !selThick || !selSize || !selQty} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50 transition">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900 border border-slate-700 p-2 rounded-lg text-sm">
                <span className="text-slate-300">
                  {item.categoryName} • {item.thicknessValue}mm • {item.sizeLabel}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+{item.quantity} sheets</span>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-slate-500 text-xs italic text-center py-2">No items added yet</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Total Glue Used (Barrels)</label>
            <input type="number" step="0.5" placeholder="e.g. 2" value={glueBarrels} onChange={(e) => setGlueBarrels(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Notes / Reason</label>
            <input type="text" placeholder="Replacing rejected log for..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white outline-none" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting || (!!duplicateWarning && !confirmMultiple)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition disabled:opacity-50">
          {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <ShieldCheck size={20} />}
          {submitting ? "Submitting..." : "Submit Production Summary"}
        </button>
      </div>
    </div>
  );
}
