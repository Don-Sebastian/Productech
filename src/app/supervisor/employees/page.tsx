"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { 
  Users, 
  Plus, 
  Phone, 
  Camera,
  X,
  UserPlus,
  Building,
  Save,
  Trash2,
  Edit3,
  Search,
  Filter,
  Loader2,
  Link2,
  GripVertical
} from "lucide-react";

import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  DragOverlay, 
  closestCorners 
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface SubDepartment {
  id: string;
  name: string;
  machineId: string | null;
}

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  photoData: string | null;
  machineId: string | null;
  subDepartmentId: string | null;
  machine: { id: string; name: string } | null;
  subDepartment: { id: string; name: string } | null;
  isActive: boolean;
}

function DraggableEmployeeCard({ emp, openEditModal }: { emp: Employee; openEditModal: (emp: Employee) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: emp.id,
    data: emp
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-slate-900 border ${isDragging ? 'border-blue-500 shadow-2xl scale-[1.02] z-50 opacity-50' : 'border-slate-800'} rounded-3xl p-4 transition-colors group flex gap-3`}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing flex flex-col justify-center -ml-2 p-2 touch-none text-slate-600 hover:text-slate-400 rounded-xl">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {emp.photoData ? (
              <img src={emp.photoData} className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-blue-500/30 transition-all" alt={emp.name} />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg group-hover:text-blue-400 transition-all">
                {emp.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-all">{emp.name}</h3>
            <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
              <Phone size={10} />
              <span className="text-[10px] font-medium truncate">{emp.phone || 'No Contact'}</span>
            </div>
            {emp.machine?.name && !emp.subDepartmentId && (
              <div className="mt-2 text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 inline-block px-2 py-0.5 rounded-md">
                General {emp.machine.name}
              </div>
            )}
            {emp.subDepartment && emp.machine && (
              <div className="mt-2 text-[9px] font-black uppercase text-slate-400 bg-slate-800 inline-block px-2 py-0.5 rounded-md">
                {emp.machine.name}
              </div>
            )}
          </div>
          <button 
            onClick={() => openEditModal(emp)}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all flex-shrink-0"
          >
            <Edit3 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`flex-shrink-0 w-[85vw] md:w-96 rounded-[40px] p-4 flex flex-col gap-4 border-2 transition-all ${isOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800/50 bg-slate-900/30'}`}
    >
      <div className="flex items-center gap-3 px-2">
        <div className={`w-1.5 h-6 rounded-full ${id === 'unassigned' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{count}</span>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pb-4">
        {children}
        {count === 0 && (
          <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-700/50 rounded-3xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Drop Worker Here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupervisorEmployees() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMachine, setFilterMachine] = useState("all");
  const [filterSubDept, setFilterSubDept] = useState("all");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState("");
  
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [subDepts, setSubDepts] = useState<SubDepartment[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    machineId: "",
    subDepartmentId: "",
    photoData: null as string | null
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const [activeEmpId, setActiveEmpId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchMetadata();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [mRes, sRes] = await Promise.all([
        fetch("/api/machines"),
        fetch("/api/sub-departments")
      ]);
      if (mRes.ok) setMachines(await mRes.json());
      if (sRes.ok) setSubDepts(await sRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingEmployee ? "PUT" : "POST";
      const payload = editingEmployee ? { ...formData, id: editingEmployee.id } : formData;
      
      const res = await fetch("/api/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingEmployee(null);
        setFormData({ name: "", phone: "", machineId: "", subDepartmentId: "", photoData: null });
        fetchEmployees();
        setShowSuccess(editingEmployee ? "✅ Worker updated!" : "✅ Worker added!");
        setTimeout(() => setShowSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxSize) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width / height) * maxSize;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          const resized = canvas.toDataURL("image/jpeg", 0.7);
          setFormData(prev => ({ ...prev, photoData: resized }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this worker from the active list?")) return;
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEmployees();
        setShowSuccess("Worker removed.");
        setTimeout(() => setShowSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      phone: emp.phone || "",
      machineId: emp.machineId || "",
      subDepartmentId: emp.subDepartmentId || "",
      photoData: emp.photoData
    });
    setIsModalOpen(true);
  };

  const filteredFormSubDepts = subDepts.filter(sd => 
    !formData.machineId || sd.machineId === formData.machineId || !sd.machineId
  );

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.phone?.includes(searchQuery);
    const matchesMachine = filterMachine === "all" || emp.machineId === filterMachine;
    const matchesSubDept = filterSubDept === "all" || emp.subDepartmentId === filterSubDept;
    return matchesSearch && matchesMachine && matchesSubDept;
  });

  const handleDragStart = (event: any) => {
    setActiveEmpId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveEmpId(null);
    if (!over) return;
    
    const empId = active.id;
    const targetId = over.id;
    
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const newSubDeptId = targetId === "unassigned" ? null : targetId;
    if (emp.subDepartmentId === newSubDeptId) return;

    const targetSubDept = subDepts.find(sd => sd.id === newSubDeptId);
    const newMachineId = targetSubDept?.machineId || emp.machineId;

    // Optimistic Update
    setEmployees(prev => prev.map(e => {
       if (e.id === empId) {
          return {
             ...e,
             subDepartmentId: newSubDeptId,
             machineId: newMachineId,
             subDepartment: newSubDeptId && targetSubDept ? { id: targetSubDept.id, name: targetSubDept.name } : null
          };
       }
       return e;
    }));

    try {
      await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: empId,
          subDepartmentId: newSubDeptId,
          machineId: newMachineId
        }),
      });
    } catch (err) {
      console.error(err);
      fetchEmployees(); // revert on fail
    }
  };

  const columns = [
    { id: "unassigned", title: "Unassigned / General" },
    ...subDepts.map(sd => ({ id: sd.id, title: sd.name }))
  ];

  const activeEmpInfo = activeEmpId ? employees.find(e => e.id === activeEmpId) : null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {session?.user && <Sidebar user={session.user} />}

      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pb-24">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <Users className="text-blue-400" size={32} />
              Workers Management
            </h1>
            <p className="text-slate-400">Add, edit and manage workers in your team</p>
          </div>
          <button 
            onClick={() => {
              setEditingEmployee(null);
              setFormData({ name: "", phone: "", machineId: "", subDepartmentId: "", photoData: null });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-900/90 text-emerald-200 border border-emerald-700/50 px-6 py-3 rounded-xl shadow-2xl font-bold text-sm">
              {showSuccess}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          {machines.length > 1 && (
            <select
              value={filterMachine}
              onChange={e => setFilterMachine(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white font-semibold outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">Every Machine</option>
              {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-slate-900/50 rounded-[40px] border border-slate-800">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-slate-500 text-sm font-bold mt-4 uppercase tracking-widest">Loading Workforce...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[40px] p-20 text-center">
            <div className="w-20 h-20 bg-slate-800 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus size={40} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Workers Found</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Click the (+) button to add your first team member.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex overflow-x-auto snap-x gap-6 pb-8 hide-scrollbar">
              {columns.map(col => {
                const colEmployees = filteredEmployees.filter(emp => col.id === "unassigned" ? !emp.subDepartmentId : emp.subDepartmentId === col.id);
                // hide column if empty and unassigned, to avoid clutter? No, keep it always
                return (
                  <DroppableColumn key={col.id} id={col.id} title={col.title} count={colEmployees.length}>
                    {colEmployees.map(emp => (
                      <DraggableEmployeeCard key={emp.id} emp={emp} openEditModal={openEditModal} />
                    ))}
                  </DroppableColumn>
                );
              })}
            </div>
            
            <DragOverlay>
              {activeEmpInfo ? (
                <div className="opacity-90 rotate-2 scale-[1.02] shadow-2xl cursor-grabbing">
                  <DraggableEmployeeCard emp={activeEmpInfo} openEditModal={openEditModal} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h2 className="text-2xl font-bold text-white">
                  {editingEmployee ? "Update Record" : "New Worker"}
                </h2>
                <button 
                  onClick={() => { setIsModalOpen(false); setEditingEmployee(null); }}
                  className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Photo Capture */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {formData.photoData ? (
                      <img src={formData.photoData} className="w-32 h-32 rounded-[40px] object-cover ring-4 ring-blue-500/20 shadow-2xl" alt="Preview" />
                    ) : (
                      <div className="w-32 h-32 rounded-[40px] bg-slate-800 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700">
                        <Camera size={32} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Snap Photo</span>
                      </div>
                    )}
                    <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                      <Camera size={24} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={handlePhotoCapture} 
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Full Name *</label>
                    <input 
                      type="text" required value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Mobile Number</label>
                    <input 
                      type="tel" value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="e.g. +91 90000 00000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-6">
                    <h4 className="text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                      <Link2 size={14} />
                      Team Assignment
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 block ml-1">Machine</label>
                        <select 
                          value={formData.machineId}
                          onChange={e => setFormData({...formData, machineId: e.target.value, subDepartmentId: ""})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">No Machine</option>
                          {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 block ml-1">Work Role / Area</label>
                        <select 
                          value={formData.subDepartmentId}
                          onChange={e => setFormData({...formData, subDepartmentId: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">General Helper</option>
                          {filteredFormSubDepts.map(sd => (
                            <option key={sd.id} value={sd.id}>{sd.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-16 rounded-[28px] font-bold shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {editingEmployee ? "Update Record" : "Enroll Worker"}
                  </button>
                  {editingEmployee && (
                    <button 
                      type="button"
                      onClick={() => handleDelete(editingEmployee.id)}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 w-16 h-16 rounded-[28px] border border-rose-500/20 flex items-center justify-center transition-all"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
