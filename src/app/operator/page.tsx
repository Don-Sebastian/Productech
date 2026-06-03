"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import { Loader2 } from "lucide-react";

export default function OperatorLanding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const { assigned, loading, machine, error } = useMachineAssignment(role, status);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && role !== "OPERATOR") router.push("/");
  }, [status, role, router]);

  useEffect(() => {
    if (status === "authenticated" && !loading && assigned && machine?.section?.slug) {
      const slug = machine.section.slug;
      const sectionRoutes: Record<string, string> = {
        hotpress: "/operator/hotpress/log",
        peeling: "/operator/peeling/log",
        dryer: "/operator/dryer/log",
        finishing: "/operator/finishing/log",
      };
      const route = sectionRoutes[slug] || "/operator/hotpress/log";
      router.replace(route);
    }
  }, [status, loading, assigned, machine, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Checking machine assignment...</p>
      </div>
    );
  }

  if (!assigned) {
    return <MachineRequiredScreen error={error} />;
  }

  return null;
}
