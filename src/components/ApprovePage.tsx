"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import DailyProductionLogCard from "./DailyProductionLogCard";
import { ClipboardCheck, CheckCircle, Clock, Package } from "lucide-react";

interface UserType {
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface ApprovePageProps {
  user: UserType;
}

export default function ApprovePage({ user }: ApprovePageProps) {
  const role = user.role as "SUPERVISOR" | "MANAGER" | "OWNER";
  const [success, setSuccess] = useState("");

  const isSupervisor = role === "SUPERVISOR";
  const isOwner = role === "OWNER";
  const isManagerOrOwner = ["MANAGER", "OWNER"].includes(role);

  const { data: apiData, isLoading: loading, refetch: fetchLogs } = useQuery({
    queryKey: ["daily-production-approvals", role],
    queryFn: async () => {
      const res = await fetch("/api/daily-production");
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
  });

  const logs = useMemo(() => (Array.isArray(apiData) ? apiData : []), [apiData]);

  const [pendingLogs, approvedLogs] = useMemo(() => {
    if (isSupervisor) {
      const pending = logs.filter((l) => l.status === "SUBMITTED");
      const approved = logs.filter((l) => ["SUPERVISOR_APPROVED", "MANAGER_APPROVED"].includes(l.status));
      return [pending, approved];
    } else {
      const pending = logs.filter((l) => l.status === "SUPERVISOR_APPROVED");
      const approved = logs.filter((l) => l.status === "MANAGER_APPROVED");
      return [pending, approved];
    }
  }, [logs, isSupervisor]);

  const handleSuccess = (msg: string) => {
    setSuccess(msg);
    fetchLogs();
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ClipboardCheck size={28} className={isSupervisor ? "text-amber-400" : isOwner ? "text-emerald-400" : "text-blue-400"} /> Approve Production
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSupervisor
              ? "Review and approve daily production logs"
              : "Final approval — adds to inventory on approval"}
          </p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-semibold flex items-center gap-2">
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isSupervisor ? "border-amber-400" : isOwner ? "border-emerald-400" : "border-blue-400"}`} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingLogs.length > 0 ? (
              <div>
                <h2 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isSupervisor ? "text-amber-300" : "text-blue-300"}`}>
                  <Clock size={16} /> NEEDS YOUR APPROVAL ({pendingLogs.length})
                </h2>
                <div className="space-y-3">
                  {pendingLogs.map((log) => (
                    <DailyProductionLogCard
                      key={log.id}
                      log={log}
                      role={role}
                      onSuccess={() => handleSuccess(isSupervisor ? "Approved! Manager notified." : "Approved! Stock updated.")}
                    />
                  ))}
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
                <h2 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isSupervisor ? "text-slate-450" : "text-emerald-400"}`}>
                  {isSupervisor ? (
                    <>
                      <CheckCircle size={16} /> APPROVED ({approvedLogs.length})
                    </>
                  ) : (
                    <>
                      <Package size={16} /> APPROVED & ADDED TO STOCK ({approvedLogs.length})
                    </>
                  )}
                </h2>
                <div className="space-y-2">
                  {approvedLogs.map((log) => (
                    <DailyProductionLogCard
                      key={log.id}
                      log={log}
                      role={role}
                      onSuccess={fetchLogs}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
