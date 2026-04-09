"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { Loader2 } from "lucide-react";

export default function OperatorLanding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [noAssignment, setNoAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | undefined>();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "OPERATOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    
    const checkAssignment = async () => {
      try {
        const res = await fetch("/api/operator/assignment");
        if (res.ok) {
          const data = await res.json();
          if (data.machine?.section?.slug) {
            const slug = data.machine.section.slug;
            // Redirect to section-specific dashboard
            const sectionRoutes: Record<string, string> = {
              hotpress: "/operator/hotpress/log",
              peeling: "/operator/peeling/log",
              dryer: "/operator/dryer/log",
              finishing: "/operator/finishing/log",
            };
            const route = sectionRoutes[slug] || "/operator/hotpress/log";
            router.replace(route);
            return;
          }
        }
        // No assignment found
        setNoAssignment(true);
        setChecking(false);
      } catch (err) {
        setAssignmentError("Failed to check assignment");
        setNoAssignment(true);
        setChecking(false);
      }
    };

    checkAssignment();
  }, [status, router]);

  if (status === "loading" || checking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Checking machine assignment...</p>
      </div>
    );
  }

  if (noAssignment) {
    return <MachineRequiredScreen error={assignmentError} />;
  }

  return null;
}
