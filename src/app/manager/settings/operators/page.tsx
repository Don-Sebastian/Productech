"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import UserManagement from "@/components/UserManagement";

export default function ManagerOperators() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "MANAGER") router.push("/");
  }, [status, session, router]);

  const { data: apiData, isLoading: loadingUsers, refetch: fetchUsers } = useQuery({
    queryKey: ["users-operators"],
    queryFn: async () => {
      const [usersRes, sectionsRes] = await Promise.all([
        fetch("/api/users?role=OPERATOR"),
        fetch("/api/sections"),
      ]);
      if (!usersRes.ok || !sectionsRes.ok) throw new Error("Failed to fetch data");
      return {
        users: await usersRes.json(),
        sections: await sectionsRes.json(),
      };
    },
    enabled: status === "authenticated",
  });

  const users = useMemo(() => Array.isArray(apiData?.users) ? apiData.users : [], [apiData]);
  const sections = useMemo(() => Array.isArray(apiData?.sections) ? apiData.sections.filter((s: any) => s.isActive) : [], [apiData]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <UserManagement
        targetRole="OPERATOR"
        title="Operators"
        description="Create and manage operators who run machines in different sections."
        showSection={true}
        accentColor="emerald"
        users={users}
        sections={sections}
        loading={loadingUsers}
        onRefresh={fetchUsers}
      />
    </div>
  );
}
