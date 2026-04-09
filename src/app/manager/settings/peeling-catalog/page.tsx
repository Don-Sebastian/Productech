"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TreePine, Plus, Trash2, X } from "lucide-react";

export default function PeelingCatalogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [treeType, setTreeType] = useState("");
  const [veneerThickness, setVeneerThickness] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/peeling-catalog");
      if (res.ok) setMaterials(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (status === "authenticated") fetchData(); }, [status]);

  const addMaterial = async () => {
    if (!treeType.trim() || !veneerThickness) { setError("Both fields are required"); return; }
    setError("");
    try {
      const res = await fetch("/api/peeling-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeType: treeType.trim(), veneerThickness }),
      });
      if (res.ok) {
        setSuccess("Material added!");
        setTreeType("");
        setVeneerThickness("");
        setShowAdd(false);
        fetchData();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to add");
      }
    } catch { setError("Network error"); }
  };

  const deleteMaterial = async (id: string) => {
    if (!window.confirm("Delete this peeling material?")) return;
    try {
      const res = await fetch(`/api/peeling-catalog?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Deleted");
        fetchData();
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError("Failed to delete");
      }
    } catch { setError("Network error"); }
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" /></div>;
  }

  // Group by tree type
  const grouped: Record<string, any[]> = {};
  materials.forEach((m) => {
    if (!grouped[m.treeType]) grouped[m.treeType] = [];
    grouped[m.treeType].push(m);
  });

  const commonTreeTypes = ["Rubber", "Mango", "Silveroak", "Eucalyptus", "Pine", "Gurjan"];

  return (
    <div className="h-full flex flex-col pt-2">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <TreePine size={28} className="text-yellow-400" />
          Peeling Catalog
        </h1>
        <p className="text-slate-400 text-sm">Define tree types and veneer thicknesses available for peeling operations</p>
      </div>

      {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-semibold">✓ {success}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Add Button */}
      <button
        onClick={() => { setShowAdd(true); setTreeType(""); setVeneerThickness(""); setError(""); }}
        className="w-full mb-6 py-3.5 rounded-xl bg-yellow-600/20 border-2 border-dashed border-yellow-500/40 text-yellow-400 font-semibold flex items-center justify-center gap-2 hover:bg-yellow-600/30 active:scale-[0.98] transition"
      >
        <Plus size={20} /> Add Peeling Material
      </button>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold text-sm">New Peeling Material</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 text-slate-500 hover:text-white"><X size={18} /></button>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tree Type</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {commonTreeTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTreeType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    treeType === t
                      ? "bg-yellow-600 text-white"
                      : "bg-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={treeType}
              onChange={(e) => setTreeType(e.target.value)}
              placeholder="Or type custom tree name..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Veneer Thickness (mm)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[0.8, 1.0, 1.2, 1.4, 1.6, 1.9, 2.0, 2.5, 3.0].map((v) => (
                <button
                  key={v}
                  onClick={() => setVeneerThickness(String(v))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    veneerThickness === String(v)
                      ? "bg-yellow-600 text-white"
                      : "bg-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {v}mm
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.1"
              value={veneerThickness}
              onChange={(e) => setVeneerThickness(e.target.value)}
              placeholder="Or type custom thickness..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>

          <button
            onClick={addMaterial}
            className="w-full py-3 bg-yellow-600 text-white font-semibold rounded-xl active:scale-[0.97] transition"
          >
            Add Material
          </button>
        </div>
      )}

      {/* Materials Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <TreePine size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No peeling materials configured yet.</p>
          <p className="text-slate-500 text-sm mt-2">Add tree types and their veneer thicknesses above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tree, items]) => (
            <div key={tree}>
              <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                <TreePine size={18} className="text-yellow-400" /> {tree}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {items.sort((a, b) => a.veneerThickness - b.veneerThickness).map((m: any) => (
                  <div key={m.id} className="bg-slate-800/40 border border-yellow-500/20 rounded-xl p-4 text-center relative group">
                    <button
                      onClick={() => deleteMaterial(m.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="text-2xl font-black text-white">{m.veneerThickness}</p>
                    <p className="text-slate-400 text-xs">mm</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
