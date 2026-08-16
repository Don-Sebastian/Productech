"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  History, 
  Phone, 
  Camera,
  Banknote,
  Check,
  X,
  CreditCard,
  Building
} from "lucide-react";
import { format } from "date-fns";

interface WageLog {
  id: string;
  beforeAmount: number;
  afterAmount: number;
  wageType: string;
  reason: string | null;
  timestamp: string;
  changedBy: { name: string; role: string };
}

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  photoData: string | null;
  wageType: "DAILY" | "WEEKLY" | "MONTHLY";
  wageAmount: number;
  isActive: boolean;
  machineId: string | null;
  subDepartmentId: string | null;
  machine: { id: string; name: string } | null;
  subDepartment: { id: string; name: string } | null;
  wageLogs: WageLog[];
}

export default function ManagerEmployees() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMachine, setFilterMachine] = useState("all");
  const [filterSubDept, setFilterSubDept] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    machineId: "",
    subDepartmentId: "",
    wageType: "DAILY" as "DAILY" | "WEEKLY" | "MONTHLY",
    wageAmount: "0",
    photoData: "" as string | null
  });

  const { data: pageData, isLoading: loading, refetch: fetchEmployees } = useQuery({
    queryKey: ["manager-employees"],
    queryFn: async () => {
      const [empRes, machRes, subRes] = await Promise.all([
        fetch("/api/employees?includeInactive=true"),
        fetch("/api/machines"),
        fetch("/api/sub-departments"),
      ]);
      return {
        employees: empRes.ok ? await empRes.json() : [],
        machines: machRes.ok ? await machRes.json() : [],
        subDepts: subRes.ok ? await subRes.json() : [],
      };
    },
  });

  const { employees, machines, subDepts } = useMemo(() => {
    return {
      employees: pageData?.employees || [],
      machines: pageData?.machines || [],
      subDepts: pageData?.subDepts || [],
    };
  }, [pageData]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEmployee ? "PUT" : "POST";
    const payload = editingEmployee ? { ...formData, id: editingEmployee.id } : formData;

    try {
      const res = await fetch("/api/employees", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingEmployee(null);
        fetchEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Operation failed");
      }
    } catch (err) {
      console.error("Error saving employee:", err);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.phone?.includes(searchQuery);
    const matchesMachine = filterMachine === "all" || emp.machineId === filterMachine;
    const matchesSubDept = filterSubDept === "all" || emp.subDepartmentId === filterSubDept;
    return matchesSearch && matchesMachine && matchesSubDept;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" /> Employee Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage employee records and adjustment logs</p>
        </div>

        <button 
          onClick={() => {
            setEditingEmployee(null);
            setFormData({ name: "", phone: "", machineId: "", subDepartmentId: "", wageType: "DAILY", wageAmount: "0", photoData: "" });
            setIsModalOpen(true);
          }}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-xl shadow-blue-500/10 flex items-center gap-2"
        >
          <Plus size={18} /> Add Employee
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-150 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search worker by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>
        
        <select 
          value={filterMachine}
          onChange={(e) => setFilterMachine(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500 transition"
        >
          <option value="all">All Machines</option>
          {machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <select 
          value={filterSubDept}
          onChange={(e) => setFilterSubDept(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-blue-500 transition"
        >
          <option value="all">All Work Areas</option>
          {subDepts.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Machine / Department</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Wage Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Wage Changes</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {emp.photoData ? (
                        <img src={emp.photoData} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                          {emp.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{emp.name}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Phone size={10} /> {emp.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Building size={14} className="text-gray-400" />
                        <span className="font-semibold">{emp.machine?.name || "General"}</span>
                      </div>
                      {emp.subDepartment && (
                        <span className="text-xs text-blue-600 font-medium pl-5">└─ {emp.subDepartment.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-bold text-gray-900">₹{emp.wageAmount.toLocaleString()}</p>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block uppercase">
                      {emp.wageType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {emp.wageLogs.length > 0 ? (
                      <button 
                        onClick={() => { setHistoryEmployee(emp); setIsHistoryOpen(true); }}
                        className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        <History size={12} /> {emp.wageLogs.length} Adjustments
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No adjustments</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setEditingEmployee(emp);
                        setFormData({
                          name: emp.name,
                          phone: emp.phone || "",
                          machineId: emp.machineId || "",
                          subDepartmentId: emp.subDepartmentId || "",
                          wageType: emp.wageType,
                          wageAmount: emp.wageAmount.toString(),
                          photoData: emp.photoData
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div className="flex gap-4 items-center mb-2">
                <div className="relative w-20 h-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden">
                  {formData.photoData ? (
                    <img src={formData.photoData} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} />
                  )}
                </div>
                <label className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg cursor-pointer transition">
                  Upload Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Full Name</label>
                  <input 
                    type="text" required value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Phone Number</label>
                  <input 
                    type="tel" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Machine</label>
                    <select 
                      value={formData.machineId}
                      onChange={e => setFormData({...formData, machineId: e.target.value, subDepartmentId: ""})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="">No Machine (General)</option>
                      {machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Work Role / Area</label>
                    <select 
                      value={formData.subDepartmentId}
                      onChange={e => setFormData({...formData, subDepartmentId: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="">General Work</option>
                      {subDepts.filter((sd: any) => !formData.machineId || sd.machineId === formData.machineId).map((sd: any) => (
                        <option key={sd.id} value={sd.id}>{sd.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Wage Basis</label>
                    <select 
                      value={formData.wageType}
                      onChange={e => setFormData({...formData, wageType: e.target.value as any})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition"
                    >
                      <option value="DAILY">Daily Wage</option>
                      <option value="WEEKLY">Weekly Salary</option>
                      <option value="MONTHLY">Monthly Salary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Rate (₹)</label>
                    <input 
                      type="number" required value={formData.wageAmount}
                      onChange={e => setFormData({...formData, wageAmount: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition">Cancel</button>
                <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-600/20">
                  {editingEmployee ? "Update Record" : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && historyEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Wage History</h2>
                  <p className="text-xs text-gray-500">Audit trail for {historyEmployee.name}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-white rounded-xl transition border border-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {historyEmployee.wageLogs.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">No wage changes recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {historyEmployee.wageLogs.map(log => (
                    <div key={log.id} className="relative pl-8 border-l-2 border-gray-100 pb-2">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            ₹{log.beforeAmount} → <span className="text-emerald-600">₹{log.afterAmount}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{format(new Date(log.timestamp), "PPp")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Changed By</p>
                          <p className="text-xs font-bold text-gray-700">{log.changedBy.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
