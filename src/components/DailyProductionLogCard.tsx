"use client";

import React, { useState, useMemo } from "react";
import { Clock, CheckCircle, ChevronDown, ChevronUp, Check, X, ClipboardCheck } from "lucide-react";

interface ProductType {
  category?: { name: string };
  thickness?: { value: number };
  size?: { label: string };
}

interface EntryType {
  product?: ProductType;
  quantity: number;
}

interface UserType {
  name: string;
}

interface DailyProductionLog {
  id: string;
  status: string;
  date: string;
  notes?: string | null;
  supervisorNotes?: string | null;
  managerNotes?: string | null;
  operator?: { name: string; sections?: string[] };
  supervisorApprovedBy?: UserType | null;
  managerApprovedBy?: UserType | null;
  entries?: EntryType[];
}

interface DailyProductionLogCardProps {
  log: DailyProductionLog;
  role: "SUPERVISOR" | "MANAGER" | "OWNER";
  onSuccess: () => void;
}

const statusBadge: Record<string, { color: string; label: string }> = {
  SUBMITTED: { color: "bg-amber-500/20 text-amber-300", label: "Pending Review" },
  SUPERVISOR_APPROVED: { color: "bg-blue-500/20 text-blue-300", label: "Approved → Manager" },
  MANAGER_APPROVED: { color: "bg-emerald-500/20 text-emerald-300", label: "Fully Approved ✓" },
  REJECTED: { color: "bg-red-500/20 text-red-300", label: "Rejected" },
};

export default function DailyProductionLogCard({ log, role, onSuccess }: DailyProductionLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSupervisor = role === "SUPERVISOR";
  const isManagerOrOwner = ["MANAGER", "OWNER"].includes(role);

  const totalQty = useMemo(() => {
    return log.entries?.reduce((sum, e) => sum + e.quantity, 0) || 0;
  }, [log.entries]);

  const canApprove = useMemo(() => {
    if (isSupervisor) return log.status === "SUBMITTED";
    if (isManagerOrOwner) return log.status === "SUPERVISOR_APPROVED";
    return false;
  }, [isSupervisor, isManagerOrOwner, log.status]);

  const sb = statusBadge[log.status] || statusBadge.SUBMITTED;

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const action = isSupervisor ? "supervisor_approve" : "manager_approve";
      const res = await fetch("/api/daily-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, logId: log.id }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || "Approval failed");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during approval");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/daily-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", logId: log.id, notes: rejectNotes }),
      });
      if (res.ok) {
        setShowReject(false);
        setRejectNotes("");
        onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || "Rejection failed");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during rejection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${
              canApprove
                ? isSupervisor
                  ? "bg-amber-500/20"
                  : "bg-blue-500/20"
                : "bg-emerald-500/20"
            } flex items-center justify-center`}
          >
            {canApprove ? (
              isSupervisor ? (
                <ClipboardCheck size={18} className="text-amber-300" />
              ) : (
                <Clock size={18} className="text-blue-300" />
              )
            ) : (
              <CheckCircle size={18} className="text-emerald-300" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-sm flex items-center gap-2">
              {isSupervisor && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  OPERATOR
                </span>
              )}
              {log.operator?.name}
            </p>
            <p className="text-slate-400 text-xs">
              {new Date(log.date).toLocaleDateString("en-IN")} • {log.entries?.length || 0} entries • {totalQty} sheets
            </p>
            {isManagerOrOwner && log.supervisorApprovedBy && (
              <p className="text-emerald-500/70 text-xs">✓ Supervisor: {log.supervisorApprovedBy.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSupervisor && (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${sb.color}`}>{sb.label}</span>
          )}
          {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
          {log.entries?.map((e, idx) => (
            <div key={idx} className="bg-slate-900/40 rounded-xl p-3 flex items-center justify-between">
              <p className="text-white text-sm font-medium">
                {e.product?.category?.name} • {e.product?.thickness?.value}mm • {e.product?.size?.label}
              </p>
              <span className="text-emerald-400 font-bold">{e.quantity} pcs</span>
            </div>
          ))}

          {canApprove && (
            <div className="pt-2 space-y-2">
              {isManagerOrOwner && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-xs font-semibold">
                    ⚠ Approving will add {totalQty} sheets to current stock
                  </p>
                </div>
              )}
              {showReject ? (
                <div className="space-y-2">
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Reason for rejection..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none text-sm focus:ring-2 focus:ring-red-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl active:scale-[0.97] transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => {
                        setShowReject(false);
                        setRejectNotes("");
                      }}
                      className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className={`flex-1 py-3.5 bg-gradient-to-r ${
                      isSupervisor
                        ? "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                        : "from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                    } text-white font-bold rounded-xl shadow-lg active:scale-[0.97] transition flex items-center justify-center gap-2 disabled:opacity-50`}
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <Check size={18} />
                    )}
                    {isSupervisor ? "Approve" : "Approve & Add to Stock"}
                  </button>
                  <button
                    onClick={() => setShowReject(true)}
                    disabled={submitting}
                    className="px-5 py-3.5 bg-red-500/20 text-red-300 font-semibold rounded-xl active:scale-[0.97] hover:bg-red-500/30 transition"
                  >
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
