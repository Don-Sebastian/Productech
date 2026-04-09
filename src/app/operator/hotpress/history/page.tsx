"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ProductionHistory from "@/components/ProductionHistory";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";

export default function OperatorHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading: assignmentLoading, error: assignmentError } = useMachineAssignment(role, status);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  if (status === "loading" || !session?.user || assignmentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400" />
      </div>
    );
  }

  if (!assigned) {
    return <MachineRequiredScreen error={assignmentError} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <ProductionHistory showOperatorFilter={false} />
      </main>
    </div>
  );
}

