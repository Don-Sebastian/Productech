"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Clock } from "lucide-react";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  machineId: string | null;
  machine?: { name: string } | null;
  subDepartmentId: string | null;
  subDepartment?: { name: string } | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [subDepartments, setSubDepartments] = useState<{ id: string; name: string; machineId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    machineId: "",
    subDepartmentId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shiftsRes, machinesRes, subDeptsRes] = await Promise.all([
        fetch("/api/shifts"),
        fetch("/api/machines"),
        fetch("/api/sub-departments")
      ]);
      setShifts(await shiftsRes.json());
      setMachines(await machinesRes.json());
      setSubDepartments(await subDeptsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startTime || !formData.endTime) return;

    try {
      if (editingId) {
        await fetch("/api/shifts", {
          method: "PUT",
          body: JSON.stringify({ ...formData, id: editingId }),
        });
      } else {
        await fetch("/api/shifts", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name: "", startTime: "", endTime: "", machineId: "", subDepartmentId: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to disable this shift?")) return;
    try {
      await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent inline-flex items-center gap-2">
            <Clock className="w-8 h-8 text-blue-600" />
            Shift Management
          </h1>
          <p className="text-gray-500 mt-1">Configure daily working hours for your teams</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", startTime: "08:00", endTime: "20:00", machineId: "", subDepartmentId: "" });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Shift Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Timings</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Assignment (Machine / Dept)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No shifts configured yet.</td>
                </tr>
              ) : (
                shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{shift.name}</td>
                    <td className="px-6 py-4 text-gray-700 font-mono">
                      {shift.startTime} - {shift.endTime}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        {shift.machine?.name ? (
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                            {shift.machine.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Global Machine</span>
                        )}
                        {shift.subDepartment?.name && (
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                            {shift.subDepartment.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setFormData({ 
                            name: shift.name, 
                            startTime: shift.startTime, 
                            endTime: shift.endTime, 
                            machineId: shift.machineId || "",
                            subDepartmentId: shift.subDepartmentId || "" 
                          });
                          setEditingId(shift.id);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? "Edit" : "Create"} Shift</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Morning Shift"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Machine (Optional)</label>
                <select
                  value={formData.machineId}
                  onChange={e => setFormData({ ...formData, machineId: e.target.value, subDepartmentId: "" })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Global (Applies to all machines)</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Department (Optional)</label>
                <select
                  value={formData.subDepartmentId}
                  onChange={e => setFormData({ ...formData, subDepartmentId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Applies to all departments</option>
                  {subDepartments
                    .filter(sd => !formData.machineId || sd.machineId === formData.machineId)
                    .map(sd => (
                      <option key={sd.id} value={sd.id}>{sd.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
