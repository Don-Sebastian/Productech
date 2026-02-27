"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Building2, Users, Shield, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data.stats);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-slate-400">Manage all companies and platform users</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Building2 className="text-violet-400" size={24} />
              </div>
              <TrendingUp className="text-emerald-400" size={16} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.totalCompanies || 0}
            </p>
            <p className="text-slate-400 text-sm">Total Companies</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="text-blue-400" size={24} />
              </div>
              <TrendingUp className="text-emerald-400" size={16} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.totalUsers || 0}
            </p>
            <p className="text-slate-400 text-sm">Total Users</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="text-emerald-400" size={24} />
              </div>
              <TrendingUp className="text-emerald-400" size={16} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.totalOwners || 0}
            </p>
            <p className="text-slate-400 text-sm">Company Owners</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/admin/companies")}
              className="flex items-center gap-4 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:bg-slate-700/50 hover:border-violet-500/30 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Building2 className="text-violet-400" size={18} />
              </div>
              <div>
                <p className="text-white font-medium">Manage Companies</p>
                <p className="text-slate-400 text-sm">View, create and manage companies</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/admin/companies")}
              className="flex items-center gap-4 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:bg-slate-700/50 hover:border-emerald-500/30 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Users className="text-emerald-400" size={18} />
              </div>
              <div>
                <p className="text-white font-medium">Company Owners</p>
                <p className="text-slate-400 text-sm">Assign and manage company owners</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
