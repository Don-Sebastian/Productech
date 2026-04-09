"use client";

import { useState, useEffect } from "react";

/**
 * Hook that checks if the current operator/supervisor has an active machine assignment.
 * Returns { assigned, loading, machine, error }.
 * If not assigned, the component should show a "Machine Required" screen.
 */
export function useMachineAssignment(role: string | undefined, status: string) {
  const [assigned, setAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!role || !["OPERATOR", "SUPERVISOR"].includes(role)) {
      // Non-operator/supervisor roles don't need machine assignment
      setAssigned(true);
      setLoading(false);
      return;
    }

    fetch("/api/operator/assignment")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.machine) {
          setAssigned(true);
          setMachine(data.machine);
        } else {
          setAssigned(false);
        }
      })
      .catch(() => {
        setError("Failed to check machine assignment");
        setAssigned(false);
      })
      .finally(() => setLoading(false));
  }, [role, status]);

  return { assigned, loading, machine, error };
}
