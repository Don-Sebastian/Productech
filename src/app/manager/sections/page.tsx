"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Building2 } from "lucide-react";

export default function ManagerSections() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const fetchSections = () => {
    fetch("/api/sections").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setSections(d.filter((s: any) => s.isActive));
      setLoading(false);
    });
  };

  useEffect(() => { if (status === "authenticated") fetchSections(); }, [status]);

  const addSection = async () => {
    if (!newName.trim()) return;
    setError("");
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      fetchSections();
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Remove this section?")) return;
    await fetch(`/api/sections?id=${id}`, { method: "DELETE" });
    fetchSections();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Building2 size={22} /> Sections</h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Manage company operation sections</p>
        </div>

        {/* Add Section */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 md:p-4 mb-4">
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Section name (e.g. Hot Press)"
              className="flex-1 px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
              onKeyDown={(e) => e.key === "Enter" && addSection()} />
            <button onClick={addSection}
              className="px-4 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg flex items-center gap-1 active:scale-[0.97]">
              <Plus size={16} /> Add
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {/* Sections List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No sections created</p>
            <p className="text-slate-500 text-xs mt-1">Add sections like Hot Press, Peeling, Drying, Finishing</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((s) => (
              <div key={s.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-slate-500 text-[10px]">Slug: {s.slug}</p>
                </div>
                <button onClick={() => deleteSection(s.id)} className="p-2 text-slate-500 hover:text-red-400 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
