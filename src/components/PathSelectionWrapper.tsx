"use client";

import AdminDashboard from "@/app/dashboard/components/AdminDashboard";
import ManagerDashboard from "@/app/dashboard/components/ManagerDashboard";
import OperatorDashboard from "@/app/dashboard/components/OperatorDashboard";
import OwnerDashboard from "@/app/dashboard/components/OwnerDashboard";
import SupervisorDashboard from "@/app/dashboard/components/SupervisorDashboard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


const roles: Record<string, string> = {
    ADMIN: "ADMIN",
    OWNER: "OWNER",
    MANAGER: "MANAGER",
    SUPERVISOR: "SUPERVISOR",
    OPERATOR: "OPERATOR",
};

export default function PathSelectionWrapper({
    adminComponent,
    ownerComponent,
    managerComponent,
    supervisorComponent,
    operatorComponent
}: {
    adminComponent: React.ReactNode;
    ownerComponent: React.ReactNode;
    managerComponent: React.ReactNode;
    supervisorComponent: React.ReactNode;
    operatorComponent: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [role, setRole] = useState<string>("OPERATOR");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }

        if (!session?.user) {
            router.replace("/login");
        }

        if (session?.user) {
            setRole((session.user as any).role);
        }
    }, [status, router, session]);


    return (
        <>
            {role === roles.ADMIN && (
                adminComponent
            )}
            {role === roles.OWNER && (
                ownerComponent
            )}
            {role === roles.MANAGER && (
                managerComponent
            )}
            {role === roles.SUPERVISOR && (
                supervisorComponent
            )}
            {role === roles.OPERATOR && (
                operatorComponent
            )}
        </>
    );
}
