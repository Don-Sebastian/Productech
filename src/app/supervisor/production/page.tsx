"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ClipboardList,
  Plus,
  CheckCircle,
  AlertCircle,
  Factory,
} from "lucide-react";

export default function SupervisorProduction() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    batchNumber: "",
    productTypeId: "",
    quantity: "",
    defectiveUnits: "0",
    status: "INITIATED",
    notes: "",
    section: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      // Set default section from user profile
      const userSection = (session?.user as any)?.section;
      if (userSection) {
        setFormData((prev) => ({ ...prev, section: userSection }));
      }

      // Fetch product types
      fetch("/api/product-types")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProductTypes(data);
        })
        .catch(console.error);
    }
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNumber: formData.batchNumber,
          productTypeId: formData.productTypeId,
          quantity: parseInt(formData.quantity),
          defectiveUnits: parseInt(formData.defectiveUnits),
          status: formData.status,
          notes: formData.notes,
          section: formData.section,
          startDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create batch");
        return;
      }

      setSuccess("Production batch created successfully!");
      setFormData({
        batchNumber: "",
        productTypeId: "",
        quantity: "",
        defectiveUnits: "0",
        status: "INITIATED",
        notes: "",
        section: (session?.user as any)?.section || "",
      });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <ClipboardList className="text-amber-400" size={28} />
            Production Entry
          </h1>
          <p className="text-slate-400">Enter production details for your section</p>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="max-w-2xl">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                    placeholder="e.g., BATCH-2024-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Type</label>
                  <select
                    value={formData.productTypeId}
                    onChange={(e) => setFormData({ ...formData, productTypeId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                    required
                  >
                    <option value="">Select product type</option>
                    {productTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} ({pt.thickness}mm)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity Produced</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Defective Units</label>
                  <input
                    type="number"
                    value={formData.defectiveUnits}
                    onChange={(e) => setFormData({ ...formData, defectiveUnits: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                  >
                    <option value="INITIATED">Initiated</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="QUALITY_CHECK">Quality Check</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition"
                  >
                    <option value="">Select section</option>
                    <option value="peeling">Peeling</option>
                    <option value="drying">Drying</option>
                    <option value="gluing">Gluing</option>
                    <option value="pressing">Pressing</option>
                    <option value="trimming">Trimming</option>
                    <option value="finishing">Finishing</option>
                    <option value="quality">Quality Control</option>
                    <option value="packing">Packing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50 outline-none transition resize-none"
                  placeholder="Additional notes about this batch..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Submit Production Entry
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
