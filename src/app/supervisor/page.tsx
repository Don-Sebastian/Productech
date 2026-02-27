"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Factory,
  CheckCircle,
  Clock,
  ClipboardList,
  MapPin,
  BarChart3,
} from "lucide-react";

export default function SupervisorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "SUPERVISOR") router.push("/");
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/dashboard/stats")
        .then((res) => res.json())
        .then((data) => {
          setStats(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  const section = stats?.section || (session.user as any)?.section;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={session.user} />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Supervisor Dashboard</h1>
          <div className="flex items-center gap-2 mt-2">
            {section && (
              <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 bg-amber-500/10 text-amber-300 rounded-full border border-amber-500/20">
                <MapPin size={14} />
                Section: {section.charAt(0).toUpperCase() + section.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Factory className="text-amber-400" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.stats?.totalBatches || 0}
            </p>
            <p className="text-slate-400 text-sm">Total Batches</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="text-emerald-400" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.stats?.completedBatches || 0}
            </p>
            <p className="text-slate-400 text-sm">Completed</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="text-blue-400" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? "..." : stats?.stats?.inProgressBatches || 0}
            </p>
            <p className="text-slate-400 text-sm">In Progress</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-amber-400" />
            Your Tasks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/supervisor/production")}
              className="flex items-center gap-4 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:bg-slate-700/50 hover:border-amber-500/30 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ClipboardList className="text-amber-400" size={18} />
              </div>
              <div>
                <p className="text-white font-medium">Enter Production Details</p>
                <p className="text-slate-400 text-sm">Log batch production data for your section</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/supervisor/batches")}
              className="flex items-center gap-4 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="text-blue-400" size={18} />
              </div>
              <div>
                <p className="text-white font-medium">View Batch Status</p>
                <p className="text-slate-400 text-sm">Check status of production batches</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
