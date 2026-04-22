"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, LayoutTemplate, Users2, Loader2, X, Cog } from "lucide-react";

interface SubDepartment {
  id: string;
  name: string;
  isActive: boolean;
  machineId: string | null;
  machine?: { name: string } | null;
  supervisorAssignments?: { user: { id: string; name: string } }[];
}

export default function SubDepartmentsPage() {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([]);
  
  const [formData, setFormData] = useState<{ name: string; machineId: string; supervisorIds: string[] }>({
    name: "",
    machineId: "",
    supervisorIds: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, machinesRes, supsRes] = await Promise.all([
        fetch("/api/sub-departments"),
        fetch("/api/machines"),
        fetch("/api/users?role=SUPERVISOR")
      ]);
      const subs = await subsRes.json();
      const machs = await machinesRes.json();
      const sups = await supsRes.json();
      setSubDepartments(subs);
      setMachines(machs);
      setSupervisors(sups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingId) {
        await fetch("/api/sub-departments", {
          method: "PUT",
          body: JSON.stringify({ ...formData, id: editingId }),
        });
      } else {
        await fetch("/api/sub-departments", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: "", machineId: "", supervisorIds: [] });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      await fetch(`/api/sub-departments?id=${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Group sub-departments by machine
  const grouped = machines.map(m => ({
    machine: m,
    departments: subDepartments.filter(sd => sd.machineId === m.id),
  }));
  const unassigned = subDepartments.filter(sd => !sd.machineId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-blue-400" />
            Sections
          </h2>
          <p className="text-slate-500 text-sm mt-1">Worker groups inside each machine (e.g., Assembly, Glue Mixer)</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", machineId: "", supervisorIds: [] });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20 text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : subDepartments.length === 0 ? (
        <div className="border-2 border-dashed border-slate-700/50 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-800 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Cog size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Sections Yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Create sections like &quot;Glue Mixer&quot;, &quot;Core Cutting&quot;, or &quot;Assembly&quot; to organize workers inside your machines.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Machine-grouped departments */}
          {grouped.filter(g => g.departments.length > 0).map(({ machine, departments }) => (
            <div key={machine.id} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{machine.name}</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{departments.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {departments.map(sub => (
                  <DepartmentCard
                    key={sub.id}
                    sub={sub}
                    onEdit={() => {
                      setFormData({ 
                        name: sub.name, 
                        machineId: sub.machineId || "",
                        supervisorIds: sub.supervisorAssignments?.map((s: any) => s.user.id) || []
                      });
                      setEditingId(sub.id);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDelete(sub.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Unassigned departments */}
          {unassigned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No Machine Assigned</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{unassigned.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unassigned.map(sub => (
                  <DepartmentCard
                    key={sub.id}
                    sub={sub}
                    onEdit={() => {
                      setFormData({ 
                        name: sub.name, 
                        machineId: sub.machineId || "",
                        supervisorIds: sub.supervisorAssignments?.map((s: any) => s.user.id) || []
                      });
                      setEditingId(sub.id);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDelete(sub.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Edit" : "New"} Section
              </h2>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Glue Mixer, Assembly Table"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Assign to Machine</label>
                <select
                  value={formData.machineId}
                  onChange={e => setFormData({ ...formData, machineId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">No Machine</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Assign Supervisors</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-700 rounded-xl p-3 bg-slate-800/50">
                  {supervisors.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 text-center">No supervisors found.</p>
                  ) : (
                    supervisors.map(sup => (
                      <label key={sup.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={formData.supervisorIds.includes(sup.id)}
                          onChange={(e) => {
                            if (e.target.checked) setFormData(p => ({ ...p, supervisorIds: [...p.supervisorIds, sup.id] }));
                            else setFormData(p => ({ ...p, supervisorIds: p.supervisorIds.filter(id => id !== sup.id) }));
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500/50 bg-slate-700"
                        />
                        <span className="text-sm font-medium text-slate-300">{sup.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-xl transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition font-bold shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentCard({ sub, onEdit, onDelete }: { sub: SubDepartment; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 group hover:border-slate-600 transition-all">
      <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
        <LayoutTemplate size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white truncate">{sub.name}</h4>
        {sub.supervisorAssignments && sub.supervisorAssignments.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-slate-500">
            <Users2 size={10} />
            <span className="text-[10px] font-medium truncate">
              {sub.supervisorAssignments.map(s => s.user.name).join(", ")}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
