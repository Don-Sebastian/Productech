"use client";

import { useState, useEffect } from "react";
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
  MoreVertical,
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

export default function ManagerEmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMachine, setFilterMachine] = useState("all");
  const [filterSubDept, setFilterSubDept] = useState("all");
  
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>([]);
  
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

  useEffect(() => {
    fetchEmployees();
    fetchMetadata();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?includeInactive=true");
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [machRes, subRes] = await Promise.all([
        fetch("/api/machines"),
        fetch("/api/sub-departments")
      ]);
      if (machRes.ok) setMachines(await machRes.json());
      if (subRes.ok) setSubDepts(await subRes.json());
    } catch (err) {
      console.error("Error fetching metadata:", err);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEmployee ? "PUT" : "POST";
    const payload = editingEmployee ? { ...formData, id: editingEmployee.id } : formData;

    try {
      const res = await fetch("/api/employees", {
        method,
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

  const filteredEmployees = employees.filter(emp => {
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
            <Users className="w-10 h-10 text-blue-600" />
            Employee Management
          </h1>
          <p className="text-gray-500 mt-1">Manage workforce and configure wage settings</p>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setFormData({
              name: "", phone: "", machineId: "", subDepartmentId: "",
              wageType: "DAILY", wageAmount: "0", photoData: null
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="all">Every Machine</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select 
            value={filterSubDept}
            onChange={(e) => setFilterSubDept(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="all">Every Sub-Dept</option>
            {subDepts.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
            <div key={emp.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-100 transition-all group">
              <div className="relative h-24 bg-gradient-to-br from-blue-500 to-indigo-600">
                <div className="absolute -bottom-10 left-6">
                  {emp.photoData ? (
                    <img src={emp.photoData} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white" alt={emp.name} />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-blue-600 text-3xl font-black">
                      {emp.name[0]}
                    </div>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
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
                    className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/40 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setHistoryEmployee(emp);
                      setIsHistoryOpen(true);
                    }}
                    className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/40 transition"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-12 px-6 pb-6 mt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{emp.name}</h3>
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5 font-medium">
                      <Phone className="w-4 h-4" />
                      {emp.phone || "No phone provided"}
                    </div>
                  </div>
                  {!emp.isActive && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">Disabled</span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assignment</p>
                    <div className="flex items-center gap-2">
                      <div className="p-1 px-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {emp.machine?.name || 'Unassigned'}
                      </div>
                      {emp.subDepartment && (
                        <div className="p-1 px-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                          {emp.subDepartment.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Wage Rate</p>
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                      <span className="text-sm font-black italic">₹</span>
                      <span className="text-xl">{emp.wageAmount.toLocaleString()}</span>
                      <span className="text-[10px] font-black uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {emp.wageType.charAt(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">{editingEmployee ? "Edit Employee" : "Add New Employee"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdate} className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Photo and Basic Info */}
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      {formData.photoData ? (
                        <img src={formData.photoData} className="w-32 h-32 rounded-3xl object-cover border-4 border-blue-100" />
                      ) : (
                        <div className="w-32 h-32 rounded-3xl bg-blue-50 flex flex-col items-center justify-center text-blue-400 border-2 border-dashed border-blue-200">
                          <Camera className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase">No Photo</span>
                        </div>
                      )}
                      <label className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl shadow-lg cursor-pointer hover:bg-blue-700 transition">
                        <Plus className="w-5 h-5" />
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    <p className="text-xs text-center text-gray-400">Upload a photo for identification (mobile-responsive)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Full Name</label>
                    <input 
                      type="text" required value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Rahul Kumar"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Phone Number</label>
                    <input 
                      type="tel" value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91 00000 00000"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Assignment and Wages */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Machine Assignment</label>
                    <select 
                      value={formData.machineId}
                      onChange={e => setFormData({...formData, machineId: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">No Specific Machine</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Sub-Department</label>
                    <select 
                      value={formData.subDepartmentId}
                      onChange={e => setFormData({...formData, subDepartmentId: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">No Sub-Department</option>
                      {subDepts.filter(sd => !formData.machineId || (sd as any).machineId === formData.machineId).map(sd => (
                        <option key={sd.id} value={sd.id}>{sd.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Wage Configuration
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Type</label>
                        <select 
                          value={formData.wageType}
                          onChange={e => setFormData({...formData, wageType: e.target.value as "DAILY" | "WEEKLY" | "MONTHLY"})}
                          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-medium"
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Amount (₹)</label>
                        <input 
                          type="number" required value={formData.wageAmount}
                          onChange={e => setFormData({...formData, wageAmount: e.target.value})}
                          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end gap-3">
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
