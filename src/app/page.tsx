"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      // Redirect to role-specific dashboard
      const role = (session.user as any).role;
      switch (role) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "OWNER":
          router.push("/owner");
          break;
        case "MANAGER":
          router.push("/manager");
          break;
        case "SUPERVISOR":
          router.push("/supervisor");
          break;
        case "OPERATOR":
          router.push("/operator");
          break;
        default:
          router.push("/login");
      }
    } else {
      router.push("/login");
    }
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
