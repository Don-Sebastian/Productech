"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MachineRequiredScreen from "@/components/MachineRequiredScreen";
import { useMachineAssignment } from "@/hooks/useMachineAssignment";
import { Loader2 } from "lucide-react";

export default function OperatorLanding({ user }: { user: any }) {
    const router = useRouter();
    const role = user?.role;
    const { assigned, loading, machine, error } = useMachineAssignment(role, "authenticated");

    useEffect(() => {
        if (!loading && assigned && machine?.section?.slug) {
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
    }, [loading, assigned, machine, router]);

    if (loading) {
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

