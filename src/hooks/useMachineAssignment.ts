"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Hook that checks if the current operator/supervisor has an active machine assignment.
 * Returns { assigned, loading, machine, error }.
 * If not assigned, the component should show a "Machine Required" screen.
 */
export function useMachineAssignment(role: string | undefined, status: string) {
  const needsAssignment = !!role && ["OPERATOR", "SUPERVISOR"].includes(role);

  const { data, isLoading, error } = useQuery({
    queryKey: ["machine-assignment"],
    queryFn: async () => {
      const res = await fetch("/api/operator/assignment");
      if (!res.ok) throw new Error("Failed to fetch assignment");
      return res.json();
    },
    enabled: status === "authenticated" && needsAssignment,
    retry: false,
  });

  if (status !== "authenticated") {
    return { assigned: false, loading: true, machine: null, error: "" };
  }

  if (!needsAssignment) {
    return { assigned: true, loading: false, machine: null, error: "" };
  }

  const assigned = !!(data && data.machine);
  const machine = data?.machine || null;
  const errorMessage = error ? "Failed to check machine assignment" : "";

  return { assigned, loading: isLoading, machine, error: errorMessage };
}
