"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  CheckCircle2,
  Clock3,
  MinusCircle,
  Plus,
  Filter,
  Send,
  Save,
  Loader2,
  Search,
  User as UserIcon,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";

interface Machine {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  machineId: string | null;
  machine: Machine | null;
  subDepartmentId: string | null;
  subDepartment: { id: string; name: string } | null;
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
}

interface AttendanceEntry {
  employeeId: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY";
  overtimeHours: number;
  notes: string;
}

export default function SupervisorAttendance() {
  const { data: session } = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>({});
  const [activeRegister, setActiveRegister] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubDept, setFilterSubDept] = useState("all");
  const [showSuccess, setShowSuccess] = useState("");

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedShift && selectedDate) {
      fetchExistingAttendance();
    }
  }, [selectedShift, selectedDate]);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const sRes = await fetch("/api/shifts");
      const shiftsData: Shift[] = await sRes.json();
      
      const eRes = await fetch("/api/employees");
      const employeesData: Employee[] = await eRes.json();
      
      setShifts(shiftsData);
      setEmployees(employeesData);
      
      if (shiftsData.length > 0) setSelectedShift(shiftsData[0].id);
      
      const initial: Record<string, AttendanceEntry> = {};
      employeesData.forEach((emp: Employee) => {
        initial[emp.id] = { employeeId: emp.id, status: "PRESENT", overtimeHours: 0, notes: "" };
      });
      setAttendance(initial);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}&shiftId=${selectedShift}`);
      if (res.ok) {
        const registers = await res.json();
        if (registers.length > 0) {
          const reg = registers[0];
          setActiveRegister(reg);
          const existing: Record<string, AttendanceEntry> = {};
          
          employees.forEach(emp => {
            existing[emp.id] = { employeeId: emp.id, status: "PRESENT", overtimeHours: 0, notes: "" };
          });
          
          reg.entries.forEach((entry: any) => {
            existing[entry.employeeId] = {
              employeeId: entry.employeeId,
              status: entry.status,
              overtimeHours: entry.overtimeHours,
              notes: entry.notes || ""
            };
          });
          setAttendance(prev => ({ ...prev, ...existing }));
        } else {
          setActiveRegister(null);
          const initial: Record<string, AttendanceEntry> = {};
          employees.forEach((emp: Employee) => {
            initial[emp.id] = { employeeId: emp.id, status: "PRESENT", overtimeHours: 0, notes: "" };
          });
          setAttendance(prev => ({ ...prev, ...initial }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cycleStatus = (employeeId: string) => {
    if (activeRegister && activeRegister.status !== 'PENDING') return;

    setAttendance(prev => {
      const current = prev[employeeId]?.status || "PRESENT";
      let next: "PRESENT" | "ABSENT" | "HALF_DAY" = "PRESENT";
      if (current === "PRESENT") next = "ABSENT";
      else if (current === "ABSENT") next = "HALF_DAY";
      
      return {
        ...prev,
        [employeeId]: { ...prev[employeeId], status: next, employeeId }
      };
    });
  };

  const updateOvertime = (employeeId: string, hours: number) => {
    if (activeRegister && activeRegister.status !== 'PENDING') return;
    setAttendance(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], overtimeHours: Math.max(0, hours), employeeId }
    }));
  };

  const markAll = (status: "PRESENT" | "ABSENT" | "HALF_DAY") => {
    if (activeRegister && activeRegister.status !== 'PENDING') return;
    setAttendance(prev => {
      const updated = { ...prev };
      filteredEmployees.forEach(emp => {
        updated[emp.id] = { ...updated[emp.id], status, employeeId: emp.id };
      });
      return updated;
    });
  };

  const handleSave = async (submit: boolean = false) => {
    if (submit) setSubmitting(true);
    else setSaving(true);
    
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          shiftId: selectedShift,
          date: selectedDate,
          entries: Object.values(attendance).filter(a => 
            filteredEmployees.some(e => e.id === a.employeeId)
          )
        }),
      });

      if (res.ok) {
        const savedReg = await res.json();
        if (submit) {
          const submitRes = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "submit",
              registerId: savedReg.id
            }),
          });
          if (submitRes.ok) {
            setShowSuccess("Attendance submitted successfully!");
            setTimeout(() => setShowSuccess(""), 4000);
          }
        } else {
          setShowSuccess("Draft saved successfully!");
          setTimeout(() => setShowSuccess(""), 3000);
        }
        fetchExistingAttendance();
      }
    } catch (err) {
      console.error(err);
      setShowSuccess("Failed to process. Please try again.");
      setTimeout(() => setShowSuccess(""), 4000);
    } finally {
      setSubmitting(false);
      setSaving(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PRESENT": return { label: "P", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-5 h-5" /> };
      case "ABSENT": return { label: "A", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", icon: <X className="w-5 h-5" /> };
      case "HALF_DAY": return { label: "H", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Clock3 className="w-5 h-5" /> };
      default: return { label: "?", color: "bg-slate-700/50 text-slate-400 border-slate-600/50", icon: null };
    }
  };

  const selectedShiftObj = shifts.find(s => s.id === selectedShift);
  const shiftMachineId = selectedShiftObj?.machineId;
  const shiftSubDeptId = selectedShiftObj?.subDepartmentId;
  
  let relevantEmployees = employees;
  if (shiftMachineId) {
    relevantEmployees = relevantEmployees.filter(emp => emp.machineId === shiftMachineId);
  }
  if (shiftSubDeptId) {
    relevantEmployees = relevantEmployees.filter(emp => emp.subDepartmentId === shiftSubDeptId);
  }

  const subDepts = [...new Set(relevantEmployees.map(e => e.subDepartment?.name).filter(Boolean))];
  const filteredEmployees = relevantEmployees.filter(emp => {
    const matchesSearch = !searchQuery || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery);
    const matchesSubDept = filterSubDept === "all" || emp.subDepartment?.name === filterSubDept;
    return matchesSearch && matchesSubDept;
  });

  const presentCount = filteredEmployees.filter(e => attendance[e.id]?.status === "PRESENT").length;
  const absentCount = filteredEmployees.filter(e => attendance[e.id]?.status === "ABSENT").length;
  const halfDayCount = filteredEmployees.filter(e => attendance[e.id]?.status === "HALF_DAY").length;
  const totalOT = filteredEmployees.reduce((acc, e) => acc + (attendance[e.id]?.overtimeHours || 0), 0);

  const isEditable = !activeRegister || activeRegister.status === 'PENDING';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {session?.user && <Sidebar user={session.user} />}

      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pb-40">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
            <ClipboardCheck className="text-emerald-400" size={32} />
            Daily Attendance
          </h1>
          <p className="text-slate-400">Mark register for your machine and shift</p>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-6 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 ${
              showSuccess.includes("Failed") ? "bg-rose-900/90 text-rose-200 border border-rose-700/50" : "bg-emerald-900/90 text-emerald-200 border border-emerald-700/50"
            }`}>
              <Check className="w-4 h-4" />
              {showSuccess}
            </div>
          </div>
        )}

        {/* Date & Shift Selectors */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input 
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 font-bold text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Clock className="w-3.5 h-3.5" /> Shift & Machine
              </label>
              <select 
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 font-bold text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
              >
                {shifts.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.name} ({s.startTime}){s.machine ? ` — ${s.machine.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {activeRegister && (
            <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 border transition-all ${
              activeRegister.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              activeRegister.status === 'REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <AlertCircle size={18} />
              <p className="text-sm font-bold uppercase tracking-wider">
                {activeRegister.status === 'PENDING' ? 'Draft Mode — Not Yet Submitted' : 
                 activeRegister.status === 'APPROVED' ? 'Attendance Approved (View Only)' :
                 'Rejected — Please Resubmit'}
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
            <p className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">Present</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-rose-400">{absentCount}</p>
            <p className="text-[9px] font-bold text-rose-500/70 uppercase tracking-widest">Absent</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{halfDayCount}</p>
            <p className="text-[9px] font-bold text-amber-500/70 uppercase tracking-widest">Half Day</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{totalOT}h</p>
            <p className="text-[9px] font-bold text-blue-500/70 uppercase tracking-widest">Overtime</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search worker name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          {subDepts.length > 0 && (
            <select
              value={filterSubDept}
              onChange={e => setFilterSubDept(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white font-semibold outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[180px]"
            >
              <option value="all">Every Role</option>
              {subDepts.map(sd => <option key={sd} value={sd}>{sd}</option>)}
            </select>
          )}
        </div>

        {/* Quick Actions */}
        {isEditable && !loading && filteredEmployees.length > 0 && (
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => markAll("PRESENT")}
              className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Mark All Present
            </button>
            <button 
              onClick={() => markAll("ABSENT")}
              className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Mark All Absent
            </button>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-[40px] border border-slate-800">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              <p className="text-slate-500 font-bold mt-4 tracking-widest uppercase text-xs">Fetching Team...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[40px] p-20 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserIcon className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Workers Found</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Try adjusting your filters or check if workers are assigned to this machine.</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const entry = attendance[emp.id] || { status: 'PRESENT', overtimeHours: 0 };
              const status = getStatusDisplay(entry.status);
              
              return (
                <div 
                  key={emp.id} 
                  className={`bg-slate-900/80 border border-slate-800 rounded-3xl p-4 transition-all group hover:border-slate-700 ${
                    entry.status === 'ABSENT' ? 'bg-rose-950/20 border-rose-900/30' : 
                    entry.status === 'HALF_DAY' ? 'bg-amber-950/20 border-amber-900/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {emp.photoData ? (
                        <img src={emp.photoData} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-800 shadow-xl" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-2xl">
                          {emp.name[0]}
                        </div>
                      )}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-4 border-slate-900 ${status.color.split(' ')[0]}`}></div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white transition-colors group-hover:text-emerald-400">{emp.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{emp.subDepartment?.name || 'Helper'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                        <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest">{emp.machine?.name}</span>
                      </div>
                    </div>

                    {/* OT Controls */}
                    <div className="flex items-center bg-slate-950/50 rounded-2xl p-1.5 border border-slate-800/50">
                      <button 
                        onClick={() => updateOvertime(emp.id, (entry.overtimeHours || 0) - 0.5)}
                        className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
                        disabled={!isEditable}
                      >
                        <MinusCircle size={20} />
                      </button>
                      <div className="px-4 text-center">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-0.5">OT</p>
                        <p className={`text-sm font-bold ${entry.overtimeHours > 0 ? "text-blue-400" : "text-slate-400"}`}>{entry.overtimeHours || 0}h</p>
                      </div>
                      <button 
                        onClick={() => updateOvertime(emp.id, (entry.overtimeHours || 0) + 0.5)}
                        className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
                        disabled={!isEditable}
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {/* Status Toggle */}
                    <button 
                      onClick={() => cycleStatus(emp.id)}
                      disabled={!isEditable}
                      className={`w-20 h-20 rounded-[28px] border shrink-0 transition-all active:scale-90 flex flex-col items-center justify-center shadow-lg ${status.color}`}
                    >
                      {status.icon}
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">{status.label}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Bar */}
        {isEditable && filteredEmployees.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 p-4 rounded-[40px] shadow-2xl flex gap-4 ring-1 ring-white/5">
              <button 
                onClick={() => handleSave(false)}
                disabled={submitting || saving}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold h-16 rounded-[28px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Draft
              </button>
              <button 
                onClick={() => {
                  if (confirm(`Submit attendance for ${filteredEmployees.length} workers?\n\nPresent: ${presentCount}\nAbsent: ${absentCount}\nHalf Day: ${halfDayCount}`)) {
                    handleSave(true);
                  }
                }}
                disabled={submitting || saving}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-16 rounded-[28px] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                Submit Register
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
