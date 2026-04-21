"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      try {
        // First: check if any users exist in the DB at all
        const res = await fetch("/api/setup/check");
        const data = await res.json();

        if (!data.isSetUp) {
          // Fresh install — no users exist, go to signup
          router.replace("/signup");
          return;
        }

        // System is set up — route based on session
        if (status === "loading") return;

        if (session?.user) {
          const role = (session.user as any).role;
          const paths: Record<string, string> = {
            ADMIN: "/admin",
            OWNER: "/owner",
            MANAGER: "/manager",
            SUPERVISOR: "/supervisor",
            OPERATOR: "/operator",
          };
          router.replace(paths[role] || "/login");
        } else {
          router.replace("/login");
        }
      } catch {
        // If check fails, default to login
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    }

    checkSetup();
  }, [session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">CRPLY</h1>
        <p className="text-blue-200">Production Manager</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
