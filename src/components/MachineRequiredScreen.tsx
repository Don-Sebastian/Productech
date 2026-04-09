"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, Cog } from "lucide-react";

interface MachineRequiredScreenProps {
  error?: string;
}

export default function MachineRequiredScreen({ error }: MachineRequiredScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[32px] p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="text-rose-400" size={36} />
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase tracking-tight">Machine Required</h1>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6">
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 px-4">
              You are not currently assigned to an active production machine. Please contact your <span className="text-white font-bold">Manager</span> to get assigned to a Hot Press, Peeling, or Dryer unit.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition shadow-lg"
              >
                Check Assignment Again
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-4 bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:text-white transition"
              >
                Back to Home
              </button>
            </div>
          </>
        )}

        <div className="mt-12 pt-8 border-t border-slate-800 flex items-center justify-center gap-2">
          <Cog size={14} className="text-slate-600 animate-spin-slow" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operator Control System v2.0</p>
        </div>
      </div>
    </div>
  );
}
