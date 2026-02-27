"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ClipboardCheck, Check, X, Clock, CheckCircle, ChevronDown, ChevronUp, Package } from "lucide-react";

export default function ManagerApproval() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    const role = (session?.user as any)?.role;
    if (status === "authenticated" && !["MANAGER", "OWNER"].includes(role)) router.push("/");
  }, [status, session, router]);

  const fetchLogs = () => {
    fetch("/api/daily-production")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); setLoading(false); });
  };

  useEffect(() => { if (status === "authenticated") fetchLogs(); }, [status]);

  const approve = async (logId: string) => {
    const res = await fetch("/api/daily-production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "manager_approve", logId }),
    });
    if (res.ok) {
      setSuccess("Approved! Stock updated.");
      fetchLogs();
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const reject = async (logId: string) => {
    await fetch("/api/daily-production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", logId, notes: rejectNotes }),
    });
    setShowReject(null);
    setRejectNotes("");
    fetchLogs();
  };

  if (status === "loading" || !session?.user) {
    return <div className="flex items-center justify-center h-screen bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>;
  }

  const pendingLogs = logs.filter((l) => l.status === "SUPERVISOR_APPROVED");
  const approvedLogs = logs.filter((l) => l.status === "MANAGER_APPROVED");

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardCheck size={28} /> Approve Production
          </h1>
          <p className="text-slate-400 text-sm mt-1">Final approval — adds to inventory on approval</p>
        </div>

        {success && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-semibold flex items-center gap-2"><CheckCircle size={18} /> {success}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>
        ) : (
          <div className="space-y-6">
            {/* Pending Manager Approval */}
            {pendingLogs.length > 0 ? (
              <div>
                <h2 className="text-blue-300 font-bold text-sm mb-3 flex items-center gap-2">
                  <Clock size={16} /> NEEDS YOUR APPROVAL ({pendingLogs.length})
                </h2>
                <div className="space-y-3">
                  {pendingLogs.map((log) => renderLog(log, true))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <CheckCircle size={48} className="mx-auto text-emerald-500/50 mb-3" />
                <p className="text-slate-400">No pending approvals</p>
              </div>
            )}

            {/* Already Approved */}
            {approvedLogs.length > 0 && (
              <div>
                <h2 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <Package size={16} /> APPROVED & ADDED TO STOCK ({approvedLogs.length})
                </h2>
                <div className="space-y-2">
                  {approvedLogs.map((log) => renderLog(log, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  function renderLog(log: any, canApprove: boolean) {
    const isExpanded = expandedId === log.id;
    const totalQty = log.entries?.reduce((sum: number, e: any) => sum + e.quantity, 0) || 0;

    return (
      <div key={log.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
        <button onClick={() => setExpandedId(isExpanded ? null : log.id)}
          className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${canApprove ? "bg-blue-500/20" : "bg-emerald-500/20"} flex items-center justify-center`}>
              {canApprove ? <Clock size={18} className="text-blue-300" /> : <CheckCircle size={18} className="text-emerald-300" />}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{log.operator?.name}</p>
              <p className="text-slate-400 text-xs">
                {new Date(log.date).toLocaleDateString("en-IN")} • {log.entries?.length} entries • {totalQty} sheets
              </p>
              {log.supervisorApprovedBy && (
                <p className="text-emerald-500/70 text-xs">✓ Supervisor: {log.supervisorApprovedBy.name}</p>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
            {log.entries?.map((e: any, idx: number) => (
              <div key={idx} className="bg-slate-900/40 rounded-xl p-3 flex items-center justify-between">
                <p className="text-white text-sm font-medium">
                  {e.product?.category?.name} • {e.product?.thickness?.value}mm • {e.product?.size?.label}
                </p>
                <span className="text-emerald-400 font-bold">{e.quantity} pcs</span>
              </div>
            ))}

            {canApprove && (
              <div className="pt-2 space-y-2">
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-xs font-semibold">⚠ Approving will add {totalQty} sheets to current stock</p>
                </div>
                {showReject === log.id ? (
                  <div className="space-y-2">
                    <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection..." rows={2}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => reject(log.id)}
                        className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl active:scale-[0.97]">Confirm Reject</button>
                      <button onClick={() => setShowReject(null)}
                        className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => approve(log.id)}
                      className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition flex items-center justify-center gap-2">
                      <Check size={18} /> Approve & Add to Stock
                    </button>
                    <button onClick={() => setShowReject(log.id)}
                      className="px-5 py-3.5 bg-red-500/20 text-red-300 font-semibold rounded-xl active:scale-[0.97]">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
