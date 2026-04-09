"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Cog, Plus, X, Trash2, UserPlus, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Users, Wrench, Shield
} from "lucide-react";

const SECTION_COLORS: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  hotpress:  { border: "border-orange-500/30", bg: "bg-orange-500/5",  text: "text-orange-400",  icon: "🔥" },
  peeling:   { border: "border-yellow-500/30", bg: "bg-yellow-500/5",  text: "text-yellow-400",  icon: "🪵" },
  dryer:     { border: "border-blue-500/30",   bg: "bg-blue-500/5",    text: "text-blue-400",    icon: "💨" },
  finishing: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-400", icon: "✨" },
};

interface MachineData {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  section: { id: string; name: string; slug: string };
  assignments: {
    id: string;
    role: string;
    assignedAt: string;
    user: { id: string; name: string; email: string; role: string };
  }[];
}

interface SectionData {
  id: string;
  name: string;
  slug: string;
  isPredefined: boolean;
}

export default function MachinerySettings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sections, setSections] = useState<SectionData[]>([]);
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add machine form
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineCode, setNewMachineCode] = useState("");

  // Assign user form
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<"OPERATOR" | "SUPERVISOR">("OPERATOR");
  const [assignUserId, setAssignUserId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && !["MANAGER", "OWNER"].includes((session?.user as any)?.role)) router.push("/");
  }, [status, session, router]);

  const fetchAll = async () => {
    try {
      const [sectRes, machRes, opRes, supRes] = await Promise.all([
        fetch("/api/sections").then(r => r.json()),
        fetch("/api/machines").then(r => r.json()),
        fetch("/api/users?role=OPERATOR").then(r => r.json()),
        fetch("/api/users?role=SUPERVISOR").then(r => r.json()),
      ]);
      if (Array.isArray(sectRes)) setSections(sectRes.filter((s: any) => s.isActive));
      if (Array.isArray(machRes)) setMachines(machRes);
      if (Array.isArray(opRes)) setOperators(opRes);
      if (Array.isArray(supRes)) setSupervisors(supRes);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchAll();
  }, [status]);

  const addMachine = async () => {
    if (!newMachineName.trim() || !newMachineCode.trim() || !addingToSection) return;
    setError("");
    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMachineName.trim(),
          code: newMachineCode.trim(),
          sectionId: addingToSection,
        }),
      });
      if (res.ok) {
        setSuccess("Machine added!");
        setNewMachineName("");
        setNewMachineCode("");
        setAddingToSection(null);
        fetchAll();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const deleteMachine = async (id: string) => {
    if (!confirm("Deactivate this machine? Current assignments will be removed.")) return;
    await fetch(`/api/machines/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const assignUser = async (machineId: string) => {
    if (!assignUserId) return;
    setError("");
    try {
      const res = await fetch(`/api/machines/${machineId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUserId, role: assignRole }),
      });
      if (res.ok) {
        setSuccess("User assigned!");
        setAssigningTo(null);
        setAssignUserId("");
        fetchAll();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed");
      }
    } catch { setError("Network error"); }
  };

  const unassignUser = async (machineId: string, assignmentId: string) => {
    await fetch(`/api/machines/${machineId}/assign?assignmentId=${assignmentId}`, { method: "DELETE" });
    fetchAll();
  };

  if (status === "loading" || !session?.user || loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  const getMachinesForSection = (sectionId: string) => machines.filter(m => m.section.id === sectionId && m.isActive);
  const availableUsers = assignRole === "OPERATOR" ? operators : supervisors;

  return (
    <div className="h-full flex flex-col pt-2">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Cog size={22} /> Machinery Management
        </h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Configure physical machines for each core factory section. Assign operators and supervisors to manage production at the machine level.
        </p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400" />
          <p className="text-sm text-emerald-300 font-bold">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {sections.map(section => {
          const colors = SECTION_COLORS[section.slug] || { border: "border-slate-700/30", bg: "bg-slate-800/40", text: "text-slate-300", icon: "⚙️" };
          const sectionMachines = getMachinesForSection(section.id);
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className={`${colors.bg} ${colors.border} border rounded-2xl overflow-hidden`}>
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{colors.icon}</span>
                  <div className="text-left">
                    <p className={`font-black text-sm tracking-widest uppercase ${colors.text}`}>{section.name}</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      {sectionMachines.length} machine{sectionMachines.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 border border-slate-700 rounded-lg px-2 py-1">
                    {sectionMachines.reduce((sum, m) => sum + m.assignments.length, 0)} assigned
                  </span>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                </div>
              </button>

              {/* Expanded: Machines */}
              {isExpanded && (
                <div className="border-t border-slate-800/50 p-4 space-y-3">
                  {sectionMachines.length === 0 && (
                    <p className="text-slate-600 text-sm text-center py-4">No machines configured for this section yet.</p>
                  )}

                  {sectionMachines.map(machine => (
                    <div key={machine.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <span className="text-white font-black text-xs">{machine.code}</span>
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{machine.name}</p>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Code: {machine.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setAssigningTo(machine.id); setAssignUserId(""); setAssignRole("OPERATOR"); }}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                            title="Assign user"
                          >
                            <UserPlus size={16} />
                          </button>
                          <button
                            onClick={() => deleteMachine(machine.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Deactivate machine"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Current Assignments */}
                      {machine.assignments.length > 0 ? (
                        <div className="space-y-2">
                          {machine.assignments.map(a => (
                            <div key={a.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                  a.role === "SUPERVISOR"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}>
                                  {a.role === "SUPERVISOR" ? <>{/* */}SUPERVISOR</> : <>OPERATOR</>}
                                </span>
                                <span className="text-white text-sm font-medium">{a.user.name}</span>
                                <span className="text-slate-600 text-[10px]">{a.user.email}</span>
                              </div>
                              <button
                                onClick={() => unassignUser(machine.id, a.id)}
                                className="text-slate-500 hover:text-red-400 p-1 transition"
                                title="Unassign"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-xs italic">No personnel assigned</p>
                      )}

                      {/* Assign User Form (inline) */}
                      {assigningTo === machine.id && (
                        <div className="mt-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3 animate-in fade-in zoom-in-95">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Assign Personnel</p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setAssignRole("OPERATOR")}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                assignRole === "OPERATOR"
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-700 text-slate-400 hover:text-white"
                              }`}
                            >
                              <Wrench size={12} className="inline mr-1" /> Operator
                            </button>
                            <button
                              onClick={() => setAssignRole("SUPERVISOR")}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                assignRole === "SUPERVISOR"
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-700 text-slate-400 hover:text-white"
                              }`}
                            >
                              <Shield size={12} className="inline mr-1" /> Supervisor
                            </button>
                          </div>

                          <select
                            value={assignUserId}
                            onChange={e => setAssignUserId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="">Select {assignRole.toLowerCase()}...</option>
                            {availableUsers.filter((u: any) => u.isActive).map((u: any) => (
                              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                          </select>

                          <div className="flex gap-2">
                            <button
                              onClick={() => assignUser(machine.id)}
                              disabled={!assignUserId}
                              className="flex-1 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg disabled:opacity-40 transition active:scale-95"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => setAssigningTo(null)}
                              className="px-4 py-2 bg-slate-700 text-slate-300 text-xs rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Machine Form */}
                  {addingToSection === section.id ? (
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">New Machine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Name</label>
                          <input
                            type="text"
                            value={newMachineName}
                            onChange={e => setNewMachineName(e.target.value)}
                            placeholder="e.g. Hot Press 1"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Code <span className="text-slate-600">(unique)</span></label>
                          <input
                            type="text"
                            value={newMachineCode}
                            onChange={e => setNewMachineCode(e.target.value.toUpperCase())}
                            placeholder="e.g. HP-1"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50 uppercase"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addMachine} disabled={!newMachineName || !newMachineCode}
                          className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs rounded-lg disabled:opacity-40 active:scale-95 transition"
                        >
                          <Plus size={14} className="inline mr-1" /> Add Machine
                        </button>
                        <button onClick={() => { setAddingToSection(null); setNewMachineName(""); setNewMachineCode(""); }}
                          className="px-4 py-2.5 bg-slate-700 text-slate-300 text-xs rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToSection(section.id)}
                      className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-xs font-bold flex items-center justify-center gap-2 hover:border-slate-500 hover:text-slate-300 transition"
                    >
                      <Plus size={16} /> Add Machine to {section.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
