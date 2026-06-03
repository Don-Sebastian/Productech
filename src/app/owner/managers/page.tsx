"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import UserManagement from "@/components/UserManagement";

export default function OwnerManagers() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OWNER") router.push("/");
  }, [status, session, router]);

  const { data: usersData, isLoading: loadingUsers, refetch: fetchUsers } = useQuery({
    queryKey: ["users", "MANAGER"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=MANAGER");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8">
        <UserManagement
          targetRole="MANAGER"
          title="Managers"
          description="Create and manage managers for your company. Managers can create supervisors and operators."
          accentColor="blue"
          users={users}
          loading={loadingUsers}
          onRefresh={fetchUsers}
        />
      </main>
    </div>
  );
}
