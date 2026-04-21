"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { 
  Banknote, 
  Calendar, 
  TrendingUp, 
  PieChart, 
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from "date-fns";

interface AttendanceEntry {
  status: "PRESENT" | "ABSENT" | "HALF_DAY";
  overtimeHours: number;
  employee: {
    id: string;
    name: string;
    wageAmount: number;
    wageType: "DAILY" | "WEEKLY" | "MONTHLY";
    machine: { name: string } | null;
    subDepartment: { name: string } | null;
  };
}

interface AttendanceRegister {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  shift: {
    name: string;
    machine: { name: string } | null;
  };
  supervisor: { name: string };
  entries: AttendanceEntry[];
}

export default function SalaryExpensesDashboard() {
  const { data: session } = useSession();
  const [registers, setRegisters] = useState<AttendanceRegister[]>([]);
  const [prevRegisters, setPrevRegisters] = useState<AttendanceRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [expandedSection, setExpandedSection] = useState<string | null>("employees");
  const [filterMachine, setFilterMachine] = useState("all");

  useEffect(() => {
    fetchExpenses();
  }, [month, weekStart, viewMode]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let startDate: string, endDate: string, prevStartDate: string, prevEndDate: string;
      
      if (viewMode === "monthly") {
        const d = new Date(month + "-01");
        startDate = format(startOfMonth(d), "yyyy-MM-dd");
        endDate = format(endOfMonth(d), "yyyy-MM-dd");
        const prevMonth = subMonths(d, 1);
        prevStartDate = format(startOfMonth(prevMonth), "yyyy-MM-dd");
        prevEndDate = format(endOfMonth(prevMonth), "yyyy-MM-dd");
      } else {
        const ws = new Date(weekStart);
        startDate = format(ws, "yyyy-MM-dd");
        endDate = format(endOfWeek(ws, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const prevWeek = subWeeks(ws, 1);
        prevStartDate = format(prevWeek, "yyyy-MM-dd");
        prevEndDate = format(endOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd");
      }

      const [currentRes, prevRes] = await Promise.all([
        fetch(`/api/attendance?status=APPROVED&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/attendance?status=APPROVED&startDate=${prevStartDate}&endDate=${prevEndDate}`)
      ]);

      if (currentRes.ok) setRegisters(await currentRes.json());
      if (prevRes.ok) setPrevRegisters(await prevRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEntryCost = (entry: AttendanceEntry) => {
    let cost = 0;
    const { wageAmount, wageType } = entry.employee;
    
    if (entry.status === 'PRESENT') {
      if (wageType === 'DAILY') cost = wageAmount;
      else if (wageType === 'WEEKLY') cost = wageAmount / 6;
      else if (wageType === 'MONTHLY') cost = wageAmount / 26;
    } else if (entry.status === 'HALF_DAY') {
      if (wageType === 'DAILY') cost = wageAmount / 2;
      else if (wageType === 'WEEKLY') cost = wageAmount / 12;
      else if (wageType === 'MONTHLY') cost = wageAmount / 52;
    }
    
    if (entry.overtimeHours > 0) {
      let hourlyRate = 0;
      if (wageType === 'DAILY') hourlyRate = wageAmount / 8;
      else if (wageType === 'WEEKLY') hourlyRate = wageAmount / 48;
      else if (wageType === 'MONTHLY') hourlyRate = wageAmount / 208;
      cost += entry.overtimeHours * hourlyRate * 1.5;
    }
    
    return cost;
  };

  const calcTotal = (regs: AttendanceRegister[]) => {
    let total = 0;
    const filteredRegs = filterMachine === "all" ? regs : regs.filter(r => r.shift.machine?.name === filterMachine);
    filteredRegs.forEach(reg => {
      reg.entries.forEach(entry => {
        total += calculateEntryCost(entry);
      });
    });
    return total;
  };

  const totalExpense = useMemo(() => calcTotal(registers), [registers, filterMachine]);
  const prevTotalExpense = useMemo(() => calcTotal(prevRegisters), [prevRegisters, filterMachine]);
  const changePercent = prevTotalExpense > 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense * 100) : 0;

  const totalOTHours = useMemo(() => {
    const filteredRegs = filterMachine === "all" ? registers : registers.filter(r => r.shift.machine?.name === filterMachine);
    return filteredRegs.reduce((acc, reg) => acc + reg.entries.reduce((a, e) => a + e.overtimeHours, 0), 0);
  }, [registers, filterMachine]);

  const costByEmployee = useMemo(() => {
    const emps: Record<string, { name: string; machine: string; total: number; daysWorked: number; otHours: number }> = {};
    const filteredRegs = filterMachine === "all" ? registers : registers.filter(r => r.shift.machine?.name === filterMachine);
    filteredRegs.forEach(reg => {
      reg.entries.forEach(entry => {
        const empId = entry.employee.id;
        if (!emps[empId]) {
          emps[empId] = { 
            name: entry.employee.name, 
            machine: entry.employee.machine?.name || "General",
            total: 0, daysWorked: 0, otHours: 0 
          };
        }
        emps[empId].total += calculateEntryCost(entry);
        emps[empId].otHours += entry.overtimeHours;
        if (entry.status === 'PRESENT') emps[empId].daysWorked += 1;
        else if (entry.status === 'HALF_DAY') emps[empId].daysWorked += 0.5;
      });
    });
    return Object.values(emps).sort((a, b) => b.total - a.total);
  }, [registers, filterMachine]);

  const machineNames = [...new Set(registers.flatMap(r => r.shift.machine?.name || "General"))];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {session?.user && <Sidebar user={session.user} />}

      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <Banknote className="text-blue-400" size={32} />
              Payroll Expenses
            </h1>
            <p className="text-slate-400">Financial tracking and worker wage analysis</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800">
              <button 
                onClick={() => setViewMode("weekly")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === "weekly" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setViewMode("monthly")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === "monthly" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                Monthly
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2">
              <Calendar size={18} className="text-slate-500 ml-2" />
              <input 
                type={viewMode === "monthly" ? "month" : "date"}
                value={viewMode === "monthly" ? month : weekStart}
                onChange={(e) => viewMode === "monthly" ? setMonth(e.target.value) : setWeekStart(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 outline-none w-36"
              />
            </div>

            {machineNames.length > 0 && (
              <select
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">Every Machine</option>
                {machineNames.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center bg-slate-900/50 rounded-[40px] border border-slate-800">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Crunching numbers...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] shadow-2xl shadow-blue-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Banknote size={80} />
                </div>
                <p className="text-blue-100 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">Total Labor Cost</p>
                <h2 className="text-4xl font-black text-white">₹{Math.round(totalExpense).toLocaleString()}</h2>
                <div className="mt-6 flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${changePercent >= 0 ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                    {changePercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(changePercent).toFixed(1)}%
                  </div>
                  <span className="text-xs text-blue-100/60 font-medium">from previous period</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-xl">
                <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px] mb-2">Overtime Impact</p>
                <h2 className="text-4xl font-black text-white">{totalOTHours}<span className="text-lg text-slate-600 ml-2">Hrs</span></h2>
                <div className="mt-6 text-xs text-slate-500">
                  Estimated premium cost: <span className="text-blue-400 font-bold">₹{Math.round(totalOTHours * 50).toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-xl">
                <p className="text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px] mb-2">Workforce Size</p>
                <h2 className="text-4xl font-black text-white">{costByEmployee.length}<span className="text-lg text-slate-600 ml-2">Workers</span></h2>
                <div className="mt-6 text-xs text-slate-500">
                  Active across <span className="text-white font-bold">{machineNames.length}</span> sections
                </div>
              </div>
            </div>

            {/* Employee Breakdown Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] shadow-xl overflow-hidden">
              <div 
                className="p-8 flex justify-between items-center cursor-pointer hover:bg-slate-800/10 transition-colors"
                onClick={() => setExpandedSection(expandedSection === "employees" ? null : "employees")}
              >
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Users className="text-indigo-400" size={24} />
                  Worker-wise Expenditure
                </h3>
                <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center transition-transform ${expandedSection === "employees" ? "rotate-180" : ""}`}>
                  <ChevronDown className="text-slate-400" />
                </div>
              </div>

              {expandedSection === "employees" && (
                <div className="overflow-x-auto px-8 pb-8">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Worker</th>
                        <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</th>
                        <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Output Days</th>
                        <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">OT Logs</th>
                        <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {costByEmployee.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 group transition-colors">
                          <td className="py-5 font-bold text-white group-hover:text-blue-400 transition-colors">{emp.name}</td>
                          <td className="py-5">
                            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              {emp.machine}
                            </span>
                          </td>
                          <td className="py-5 text-center font-bold text-slate-300">{emp.daysWorked}</td>
                          <td className="py-5 text-center font-bold text-blue-400/80">{emp.otHours}h</td>
                          <td className="py-5 text-right font-black text-emerald-400 text-lg italic">
                            ₹{Math.round(emp.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950/40">
                        <td colSpan={2} className="py-6 px-4 font-black text-slate-500 uppercase text-xs">Total Summary</td>
                        <td className="py-6 text-center font-black text-white">{costByEmployee.reduce((a, e) => a + e.daysWorked, 0)}</td>
                        <td className="py-6 text-center font-black text-blue-400">{costByEmployee.reduce((a, e) => a + e.otHours, 0)}h</td>
                        <td className="py-6 text-right font-black text-emerald-400 text-2xl italic pr-2">₹{Math.round(totalExpense).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
