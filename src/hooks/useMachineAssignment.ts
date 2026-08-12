"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

/**
 * Hook that checks if the current operator/supervisor has an active machine assignment.
 * Returns { assigned, loading, machine, error }.
 * If not assigned, the component should show a "Machine Required" screen.
 */
export function useMachineAssignment(role: string | undefined, status: string) {
  const { data: session } = useSession();
  const realRole = (session?.user as any)?.realRole;

  const needsAssignment = !!role && ["OPERATOR", "SUPERVISOR"].includes(role);

  const { data, isLoading, error } = useQuery({
    queryKey: ["machine-assignment", role],
    queryFn: async () => {
      const res = await fetch("/api/operator/assignment");
      if (!res.ok) throw new Error("Failed to fetch assignment");
      return res.json();
    },
    enabled: status === "authenticated" && needsAssignment && (!realRole || realRole === role),
    retry: false,
  });

  if (status !== "authenticated") {
    return { assigned: false, loading: true, machine: null, error: "" };
  }

  // If a user is impersonating an Operator or Supervisor (e.g. Technician, Owner, Manager)
  if (realRole && realRole !== role) {
    const techSection = (typeof window !== "undefined" && localStorage.getItem("tech_operator_section")) || "hotpress";
    return {
      assigned: true,
      loading: false,
      machine: {
        id: "mock-impersonation-machine",
        name: "Impersonation Simulator",
        code: "IMP-1",
        section: {
          id: "mock-impersonation-section",
          name: techSection.toUpperCase(),
          slug: techSection
        }
      },
      error: ""
    };
  }

  if (!needsAssignment) {
    return { assigned: true, loading: false, machine: null, error: "" };
  }

  const assigned = !!(data && data.machine);
  const machine = data?.machine || null;
  const errorMessage = error ? "Failed to check machine assignment" : "";

  return { assigned, loading: isLoading, machine, error: errorMessage };
}
