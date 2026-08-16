import Sidebar from "@/components/Sidebar";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Layers, Factory, Users, Wrench, Settings2 } from "lucide-react";
import SettingsNav from "./SettingsNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Basic role protection (client pages will handle strict redirects if needed)
  const user = session?.user;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar user={user as any} />
      
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 flex flex-col h-screen overflow-hidden">
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Company Settings</h1>
          <p className="text-slate-400 text-sm">Manage configuration, catalog, customizations, and personnel</p>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <SettingsNav />
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/50">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
