"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
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
  Building,
  TrendingUp,
  ShieldCheck,
  UserCheck
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

export default function OwnerEmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMachine, setFilterMachine] = useState("all");
  
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  
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
    photoData: null as string | null
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/machines");
      if (res.ok) setMachines(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingEmployee.id }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMachine = filterMachine === "all" || emp.machineId === filterMachine;
    return matchesSearch && matchesMachine;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Users className="w-12 h-12 text-emerald-600" />
            Company Workers
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Full visibility into your factory workforce and their compensation logs.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-4 px-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Workers</p>
            <p className="text-2xl font-black text-gray-900">{employees.filter(e => e.isActive).length}</p>
          </div>
          <div className="bg-white p-4 px-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Wage</p>
            <p className="text-2xl font-black text-emerald-600">₹{employees.filter(e => e.isActive && e.wageType === 'DAILY').reduce((acc, curr) => acc + curr.wageAmount, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 px-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Wage Edits</p>
            <p className="text-2xl font-black text-blue-600">{employees.reduce((acc, curr) => acc + curr.wageLogs.length, 0)}</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl shadow-sm border border-white mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search worker by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-50 rounded-2xl text-lg font-bold placeholder:text-gray-300 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm"
          />
        </div>
        <select 
          value={filterMachine}
          onChange={(e) => setFilterMachine(e.target.value)}
          className="px-6 py-4 bg-white border-2 border-gray-50 rounded-2xl text-lg font-bold text-gray-700 focus:border-emerald-500 focus:ring-0 transition-all shadow-sm"
        >
          <option value="all">All Machines</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Employee Profile</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Department</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Wage Rate</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Audit Status</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-emerald-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {emp.photoData ? (
                            <img src={emp.photoData} className="w-16 h-16 rounded-[24px] object-cover ring-4 ring-white shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 rounded-[24px] bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-2xl ring-4 ring-white shadow-sm">
                              {emp.name[0]}
                            </div>
                          )}
                          {emp.isActive ? (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                          ) : (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900 leading-tight">{emp.name}</p>
                          <p className="text-sm font-medium text-gray-500 mt-0.5">{emp.phone || "No contact info"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-300" />
                          <span className="text-sm font-bold text-gray-700">{emp.machine?.name || "General"}</span>
                        </div>
                        {emp.subDepartment && (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-[2px] bg-emerald-200"></span>
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{emp.subDepartment.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                          <span className="text-sm italic">₹</span>
                          <span className="text-2xl tracking-tighter">{emp.wageAmount.toLocaleString()}</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-[10px] font-black text-emerald-600 rounded-lg border border-emerald-100 mt-1">
                          PER {emp.wageType}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {emp.wageLogs.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-blue-600">{emp.wageLogs.length} Adjustments</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Last: {format(new Date(emp.wageLogs[0].timestamp), "MMM dd")}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 opacity-30">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-gray-400 uppercase italic">Unchanged</p>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setHistoryEmployee(emp);
                            setIsHistoryOpen(true);
                          }}
                          className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="View Audit Logs"
                        >
                          <History className="w-5 h-5" />
                        </button>
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
                          className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="Quick Wage Adjustment"
                        >
                          <Banknote className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wage Edit Modal */}
      {isModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-xl overflow-hidden border border-white">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-emerald-50/30">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-600/20">
                  <Banknote className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-none">Adjust Wage</h2>
                  <p className="text-emerald-600/70 font-bold text-sm mt-1 uppercase tracking-widest">{editingEmployee.name}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Frequency</label>
                  <select 
                    value={formData.wageType}
                    onChange={e => setFormData({...formData, wageType: e.target.value as any})}
                    className="w-full px-6 py-5 rounded-3xl bg-gray-50 border-none font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DAILY">Daily Wage</option>
                    <option value="WEEKLY">Weekly Pay</option>
                    <option value="MONTHLY">Monthly Salary</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                  <input 
                    type="number" required value={formData.wageAmount}
                    onChange={e => setFormData({...formData, wageAmount: e.target.value})}
                    className="w-full px-6 py-5 rounded-3xl bg-emerald-50 border-none font-black text-2xl text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[32px] flex gap-4">
                <ShieldCheck className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div>
                  <h4 className="font-black text-amber-900 text-sm italic">Audit Enforcement</h4>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">This adjustment will be permanently logged. Managers will see you authorized this change. Ensure accuracy before saving.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 text-gray-400 font-black text-lg hover:bg-gray-50 rounded-[32px] transition">Cancel</button>
                <button type="submit" className="flex-[2] px-8 py-5 bg-emerald-600 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 transition active:scale-95">
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && historyEmployee && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white">
            <div className="p-8 px-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 relative overflow-hidden">
                  <History className="w-6 h-6 z-10" />
                  <div className="absolute inset-0 bg-blue-50/50"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Audit Trail</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Wage History: {historyEmployee.name}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {historyEmployee.wageLogs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                    <History className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No Audit History Found</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {historyEmployee.wageLogs.map((log, idx) => (
                    <div key={log.id} className="relative flex gap-8">
                      {/* Timeline Line */}
                      {idx !== historyEmployee.wageLogs.length - 1 && (
                        <div className="absolute left-[27px] top-[54px] bottom-[-32px] w-[2px] bg-gradient-to-b from-blue-200 to-transparent"></div>
                      )}
                      
                      <div className="w-14 flex-shrink-0 flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-blue-100 border-4 border-white shadow-sm flex items-center justify-center text-blue-600 font-black text-lg z-10">
                          {log.changedBy.name[0]}
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-gray-50 p-6 rounded-[32px] border-2 border-white shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{log.changedBy.role}</p>
                            <p className="text-lg font-black text-gray-900">{log.changedBy.name}</p>
                          </div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                            {format(new Date(log.timestamp), "MMM dd, yyyy")}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100">
                          <div className="text-center flex-1 border-r border-gray-50 pr-4">
                            <p className="text-[8px] font-bold text-gray-300 uppercase mb-1">Before</p>
                            <p className="text-sm font-bold text-gray-400 italic strike-through">₹{log.beforeAmount.toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="text-center flex-1 pl-4">
                            <p className="text-[8px] font-bold text-gray-300 uppercase mb-1 border-b border-emerald-50">Authorized Rate</p>
                            <p className="text-lg font-black text-emerald-600 italic">₹{log.afterAmount.toLocaleString()}</p>
                          </div>
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

      <style jsx>{`
        .strike-through { text-decoration: line-through; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
}
