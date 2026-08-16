"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MachineLogView from "@/components/MachineLogView";

const loaderColors: Record<string, string> = {
  OWNER: "border-emerald-400",
  MANAGER: "border-blue-400",
  SUPERVISOR: "border-amber-400",
};

export default function LogHistoryRouterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && !["OWNER", "MANAGER", "SUPERVISOR"].includes(role)) {
      router.push("/");
    }
  }, [status, role, router]);

  if (status === "loading" || !session?.user || !["OWNER", "MANAGER", "SUPERVISOR"].includes(role)) {
    const loaderColor = loaderColors[role] || "border-blue-400";
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${loaderColor}`} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-3 md:p-8">
        <MachineLogView showOperatorFilter={true} />
      </main>
    </div>
  );
}
