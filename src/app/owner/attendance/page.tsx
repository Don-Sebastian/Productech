"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Search,
  Building,
  Eye,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface AttendanceEntry {
  id: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY";
  overtimeHours: number;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    subDepartment: { name: string } | null;
    machine: { name: string } | null;
    photoData: string | null;
    wageAmount: number;
    wageType: string;
  };
}

interface AttendanceRegister {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    machine: { name: string } | null;
  };
  supervisor: { name: string };
  manager: { name: string } | null;
  entries: AttendanceEntry[];
}

export default function OwnerAttendanceView() {
  const { data: session } = useSession();
  const [registers, setRegisters] = useState<AttendanceRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchRegisters();
  }, [filterDate, filterStatus]);

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterDate) query.append("date", filterDate);
      if (filterStatus !== "all") query.append("status", filterStatus);
      
      const res = await fetch(`/api/attendance?${query.toString()}`);
      if (res.ok) {
        setRegisters(await res.json());
      }
    } catch (err) {
      console.error("Error fetching attendance registers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "APPROVED": return { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={16} /> };
      case "REJECTED": return { badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: <AlertCircle size={16} /> };
      default: return { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: <Clock size={16} /> };
    }
  };

  const getEntryStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT": return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">Present</span>;
      case "ABSENT": return <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-500/20">Absent</span>;
      case "HALF_DAY": return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-500/20">Half Day</span>;
      default: return null;
    }
  };

  const totalPresent = registers.reduce((acc, reg) => acc + reg.entries.filter(e => e.status === 'PRESENT').length, 0);
  const totalAbsent = registers.reduce((acc, reg) => acc + reg.entries.filter(e => e.status === 'ABSENT').length, 0);
  const totalHalfDay = registers.reduce((acc, reg) => acc + reg.entries.filter(e => e.status === 'HALF_DAY').length, 0);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {session?.user && <Sidebar user={session.user} />}

      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <Eye className="text-emerald-400" size={32} />
              Attendance Overview
            </h1>
            <p className="text-slate-400">Master visibility across all factory sections</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-xl">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-800/50 border-none rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
              />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-800/50 border-none rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/50 outline-none min-w-[140px]"
            >
              <option value="all">Every Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Global Stats */}
        {!loading && registers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center">
              <p className="text-3xl font-black text-white">{registers.length}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Registers</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
              <p className="text-3xl font-black text-emerald-400">{totalPresent}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Present Today</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl text-center">
              <p className="text-3xl font-black text-rose-400">{totalAbsent}</p>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">Absent</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl text-center">
              <p className="text-3xl font-black text-amber-400">{totalHalfDay}</p>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Half Day</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/50 rounded-[40px] border border-slate-800">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aggregating Data...</p>
          </div>
        ) : registers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/50 rounded-[40px] border border-slate-800 border-dashed text-center px-4">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white">No Logs Found</h3>
            <p className="text-slate-500 max-w-sm mt-2">Attendance data for this date is not yet available.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {registers.map((reg) => {
              const statusInfo = getStatusDisplay(reg.status);
              return (
                <div 
                  key={reg.id} 
                  className={`bg-slate-900 rounded-[32px] border transition-all overflow-hidden ${
                    expandedId === reg.id ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Register Header */}
                  <div 
                    className="p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${statusInfo.badge}`}>
                        {statusInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white">{reg.shift.name}</h3>
                          {reg.shift.machine && (
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-1.5">
                              <Building size={12} />
                              {reg.shift.machine.name}
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusInfo.badge}`}>
                            {reg.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-2 text-xs">
                          <span className="flex items-center gap-2 font-bold text-slate-300">
                            <UserIcon size={14} className="text-slate-500" />
                            Sup: {reg.supervisor.name}
                          </span>
                          {reg.manager && (
                            <span className="flex items-center gap-2 font-bold text-emerald-400">
                              <CheckCircle2 size={14} />
                              Mgr: {reg.manager.name}
                            </span>
                          )}
                          <span className="flex items-center gap-2 text-slate-400">
                            <Clock size={14} className="text-slate-500" />
                            {reg.shift.startTime} - {reg.shift.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block pr-6 border-r border-slate-800 font-mono">
                        <p className="text-lg text-white font-bold">
                          <span className="text-emerald-400">{reg.entries.filter(e => e.status === 'PRESENT').length}</span>
                          <span className="text-slate-700mx-1">/</span>
                          <span className="text-rose-400">{reg.entries.filter(e => e.status === 'ABSENT').length}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">P/A Count</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center transition-transform duration-300 ${expandedId === reg.id ? 'rotate-180' : ''}`}>
                        <ChevronDown className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Details Overlay */}
                  {expandedId === reg.id && (
                    <div className="p-8 bg-slate-950/30 border-t border-slate-800">
                      <div className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-inner">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Placement</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Log</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Overtime</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {reg.entries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    {entry.employee.photoData ? (
                                      <img 
                                        src={entry.employee.photoData} 
                                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-emerald-500/30 transition-all"
                                        alt={entry.employee.name}
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-700">
                                        {entry.employee.name[0]}
                                      </div>
                                    )}
                                    <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{entry.employee.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div>
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">{entry.employee.subDepartment?.name || 'Worker'}</p>
                                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase opacity-60 truncate max-w-[120px]">{entry.employee.machine?.name || 'N/A'}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  {getEntryStatusBadge(entry.status)}
                                </td>
                                <td className="px-6 py-5 text-sm font-bold text-blue-400">
                                  {entry.overtimeHours > 0 ? `+${entry.overtimeHours}h` : '—'}
                                </td>
                                <td className="px-6 py-5 text-sm font-black text-emerald-500 italic">
                                  ₹{entry.employee.wageAmount.toLocaleString()}<span className="text-[10px] text-slate-600 font-normal ml-1">/{entry.employee.wageType[0]}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
