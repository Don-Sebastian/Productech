"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2, Settings2 } from "lucide-react";

export default function CustomizationsSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [customizations, setCustomizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const fetchData = () => {
    fetch("/api/customizations")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCustomizations(d.filter((c: any) => c.isActive));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status]);

  const addCustomization = async () => {
    if (!newName.trim()) return;
    setError("");
    setSuccess("");
    const res = await fetch("/api/customizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setSuccess("Customization added");
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  };

  const deleteCustomization = async (id: string) => {
    if (!confirm("Remove this customization?")) return;
    await fetch(`/api/customizations/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>;
  }

  return (
    <div className="h-full flex flex-col pt-2">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Settings2 size={22} className="text-cyan-400" /> Order Customizations</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">Manage frequently used customizations (e.g. Special Wood, Corner Cut)</p>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 md:p-4 mb-4">
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Customization name (e.g. Special Trim)"
            className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
            onKeyDown={(e) => e.key === "Enter" && addCustomization()} />
          <button onClick={addCustomization}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-lg flex items-center gap-1 active:scale-[0.97] transition">
            <Plus size={16} /> Add
          </button>
        </div>
        {success && <p className="text-emerald-400 text-xs mt-2">{success}</p>}
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" /></div>
      ) : customizations.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-2xl">
          <Settings2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No customizations created</p>
          <p className="text-slate-500 text-xs mt-1">Add items that can be attached to new orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {customizations.map((c) => (
            <div key={c.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 flex items-center justify-between group">
              <span className="text-white font-semibold text-sm">{c.name}</span>
              <button onClick={() => deleteCustomization(c.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-md transition">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
