"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import ApprovalCard from "./ApprovalCard";
import dynamic from "next/dynamic";
import { CheckCircle2, ShieldCheck, Clock, Plus } from "lucide-react";

const ManualSummaryModal = dynamic(() => import("./ManualSummaryModal"), {
  ssr: false,
});

interface UserType {
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface ApprovalsPageProps {
  user: UserType;
}

export default function ApprovalsPage({ user }: ApprovalsPageProps) {
  const [showManualModal, setShowManualModal] = useState(false);
  const role = user.role as "SUPERVISOR" | "MANAGER" | "OWNER";

  const isOwner = role === "OWNER";
  const isSupervisor = role === "SUPERVISOR";
  const isManagerOrOwner = ["MANAGER", "OWNER"].includes(role);

  const { data: apiData, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ["approvals", role],
    queryFn: async () => {
      const res = await fetch("/api/hotpress?view=approval");
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
  });

  const sessions = apiData?.pendingSessions || [];

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {isSupervisor ? (
                  <CheckCircle2 className="text-blue-400" size={28} />
                ) : (
                  <ShieldCheck className={isOwner ? "text-emerald-400" : "text-blue-400"} size={28} />
                )}
                {isSupervisor ? "Production Approvals" : "Approve Production"}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isSupervisor ? (
                  "Review and approve operator production logs"
                ) : (
                  <>
                    Review supervisor-approved logs.{" "}
                    <strong className="text-amber-400">Approval updates current stock.</strong>
                  </>
                )}
              </p>
            </div>
            {isManagerOrOwner && (
              <button
                onClick={() => setShowManualModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} /> New Manual Summary
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-slate-400 flex flex-col items-center gap-3">
                <Clock className={`animate-pulse ${isOwner ? "text-emerald-500" : "text-blue-500"}`} size={40} />
                <p>Loading pending approvals...</p>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400">No pending approvals</p>
              <p className="text-slate-500 text-sm mt-1">All production logs are up to date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((sess: any) => (
                <ApprovalCard
                  key={sess.id}
                  session={sess}
                  role={role}
                  onSuccess={fetchData}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showManualModal && (
        <ManualSummaryModal
          onClose={() => setShowManualModal(false)}
          onSuccess={() => {
            setShowManualModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
