"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  User,
  Mail,
  Shield,
  Loader2,
  LogOut,
  Wrench,
  Crown,
  Layers,
  ArrowRight,
  Sparkles,
  Building,
  CheckCircle2,
  Flame,
  TreePine,
  Wind,
  Scissors,
  ArrowLeftRight,
} from "lucide-react";

interface AccountPageProps {
  allowedRole: string;
}

export default function AccountPage({ allowedRole }: AccountPageProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [impersonationEnabled, setImpersonationEnabled] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "impersonation" | "security">("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setImpersonationEnabled(localStorage.getItem("impersonationEnabled") === "true");
    }
  }, []);

  const handleToggleImpersonation = async (enabled: boolean) => {
    setImpersonationEnabled(enabled);
    if (enabled) {
      localStorage.setItem("impersonationEnabled", "true");
      window.location.reload();
    } else {
      localStorage.removeItem("impersonationEnabled");
      const realRole = (session?.user as any)?.realRole;
      const currentRole = (session?.user as any)?.role;
      if (realRole && currentRole && realRole !== currentRole) {
        setSwitchingRole(true);
        await update({ viewRole: realRole, viewSection: null });
        const paths: Record<string, string> = {
          ADMIN: "/admin",
          OWNER: "/owner",
          MANAGER: "/manager",
          SUPERVISOR: "/supervisor",
          OPERATOR: "/operator",
        };
        window.location.href = paths[realRole] || "/";
        return;
      }
      window.location.reload();
    }
  };

  const handleSwitchPortal = async (targetRole: string, targetSection?: string) => {
    setSwitchingRole(true);
    const viewSection = targetSection || (targetRole === "OPERATOR" || targetRole === "SUPERVISOR" ? "hotpress" : null);
    await update({ viewRole: targetRole, viewSection });
    const paths: Record<string, string> = {
      ADMIN: "/admin",
      OWNER: "/owner",
      MANAGER: "/manager",
      SUPERVISOR: "/supervisor",
      OPERATOR: "/operator",
    };
    window.location.href = paths[targetRole] || "/";
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (
      status === "authenticated" &&
      (session?.user as any)?.role !== allowedRole &&
      (session?.user as any)?.realRole !== allowedRole &&
      (session?.user as any)?.realRole !== "OWNER" &&
      (session?.user as any)?.realRole !== "TECHNICIAN"
    ) {
      router.push("/");
    }
  }, [status, session, router, allowedRole]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to change password");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const user = session.user;
  const role = (user as any)?.role || "";
  const realRole = (user as any)?.realRole || role;
  const currentSection = (user as any)?.section || null;
  const isSuperUser = realRole === "OWNER" || realRole === "TECHNICIAN";
  const canAccessImpersonation =
    ["OWNER", "MANAGER", "TECHNICIAN"].includes(realRole) ||
    ["OWNER", "MANAGER", "TECHNICIAN"].includes(role) ||
    ["OWNER", "MANAGER", "TECHNICIAN"].includes(allowedRole);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8 pb-32">
        {/* Header Title */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                My Account
              </h1>
              {realRole === "OWNER" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Crown size={12} className="text-amber-400 fill-amber-400" /> Owner Account
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm">
              Manage your user profile, security preferences, and portal access
            </p>
          </div>

          {/* Quick Impersonation status pill in header */}
          {canAccessImpersonation && (
            <div className="flex items-center gap-3">
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${impersonationEnabled
                    ? "bg-purple-950/60 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-950/40"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${impersonationEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                    }`}
                />
                <span>Impersonation: {impersonationEnabled ? "ACTIVE" : "DISABLED"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl space-y-8">
          {/* ============================================================ */}
          {/* ADVANCED SETTINGS: ROLE IMPERSONATION & PORTAL SWITCHER HUB */}
          {/* ============================================================ */}
          {canAccessImpersonation && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-purple-950/20 to-slate-900/95 border-2 border-purple-500/40 p-6 md:p-8 shadow-2xl shadow-purple-950/30 backdrop-blur-2xl">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

              {/* Card Header & Toggle Switch */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-purple-500/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-slate-950/60 rounded-[14px] flex items-center justify-center text-purple-300">
                      <Wrench size={24} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                        Advanced Settings: Role Impersonation
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Control Center
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Enable subordinate view switching to test and act inside lower-ranked portals (Manager, Supervisor, Operator).
                    </p>
                  </div>
                </div>

                {/* Sleek Interactive Switch Button */}
                <div className="flex items-center gap-4 shrink-0 bg-slate-950/80 p-2 rounded-2xl border border-purple-500/30 shadow-inner">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 pl-2">
                    {impersonationEnabled ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Enabled
                      </span>
                    ) : (
                      <span className="text-slate-500">Disabled</span>
                    )}
                  </span>

                  <button
                    id="impersonation-toggle-btn"
                    aria-label="Toggle Role Impersonation"
                    type="button"
                    onClick={() => handleToggleImpersonation(!impersonationEnabled)}
                    className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${impersonationEnabled
                        ? "bg-purple-600 border-purple-400 shadow-lg shadow-purple-600/40"
                        : "bg-slate-800 border-slate-700"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out mt-0.5 ${impersonationEnabled ? "translate-x-7 bg-white" : "translate-x-0.5 bg-slate-400"
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Subordinate Access & Quick Portal Switcher Grid */}
              <div className="relative z-10 pt-6 space-y-6">
                {impersonationEnabled ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                        <ArrowLeftRight size={14} /> Quick Switch Portal View
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Current active view: <strong className="text-white uppercase font-black">{role}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Owner Card (Root) */}
                      {(realRole === "OWNER" || realRole === "TECHNICIAN") && (
                        <div
                          className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${role === "OWNER"
                              ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/50 shadow-lg shadow-amber-950/30"
                              : "bg-slate-900/80 border-slate-800 hover:border-amber-500/30 hover:bg-slate-850"
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm">
                                <Crown size={16} />
                              </div>
                              {role === "OWNER" && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Active View
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">Company Owner</h4>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              Root dashboard, company finances, high-level analytics & logs.
                            </p>
                          </div>
                          <button
                            onClick={() => handleSwitchPortal("OWNER")}
                            disabled={role === "OWNER" || switchingRole}
                            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${role === "OWNER"
                                ? "bg-amber-500/20 text-amber-300 cursor-default"
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95"
                              }`}
                          >
                            <span>{role === "OWNER" ? "Currently Active" : "Switch to Owner"}</span>
                            {role !== "OWNER" && <ArrowRight size={12} />}
                          </button>
                        </div>
                      )}

                      {/* Manager Card */}
                      {(realRole === "OWNER" || realRole === "TECHNICIAN") && (
                        <div
                          className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${role === "MANAGER"
                              ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/50 shadow-lg shadow-blue-950/30"
                              : "bg-slate-900/80 border-slate-800 hover:border-blue-500/30 hover:bg-slate-850"
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm">
                                👔
                              </div>
                              {role === "MANAGER" && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  Active View
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">Manager Portal</h4>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              Approve production logs, manage orders, dispatch loads & inventory.
                            </p>
                          </div>
                          <button
                            onClick={() => handleSwitchPortal("MANAGER")}
                            disabled={role === "MANAGER" || switchingRole}
                            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${role === "MANAGER"
                                ? "bg-blue-500/20 text-blue-300 cursor-default"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95"
                              }`}
                          >
                            <span>{role === "MANAGER" ? "Currently Active" : "Switch to Manager"}</span>
                            {role !== "MANAGER" && <ArrowRight size={12} />}
                          </button>
                        </div>
                      )}

                      {/* Supervisor Card */}
                      {(realRole === "OWNER" || realRole === "MANAGER" || realRole === "TECHNICIAN") && (
                        <div
                          className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${role === "SUPERVISOR"
                              ? "bg-gradient-to-br from-amber-600/20 to-orange-500/10 border-amber-500/50 shadow-lg shadow-amber-950/30"
                              : "bg-slate-900/80 border-slate-800 hover:border-amber-500/30 hover:bg-slate-850"
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm">
                                👷
                              </div>
                              {role === "SUPERVISOR" && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Active View
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">Supervisor Portal</h4>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              Mark worker attendance, review floor machines, manage shifts.
                            </p>
                          </div>
                          <button
                            onClick={() => handleSwitchPortal("SUPERVISOR")}
                            disabled={role === "SUPERVISOR" || switchingRole}
                            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${role === "SUPERVISOR"
                                ? "bg-amber-500/20 text-amber-300 cursor-default"
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95"
                              }`}
                          >
                            <span>{role === "SUPERVISOR" ? "Currently Active" : "Switch to Supervisor"}</span>
                            {role !== "SUPERVISOR" && <ArrowRight size={12} />}
                          </button>
                        </div>
                      )}

                      {/* Operator Card */}
                      {(realRole === "OWNER" || realRole === "MANAGER" || realRole === "TECHNICIAN") && (
                        <div
                          className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${role === "OPERATOR"
                              ? "bg-gradient-to-br from-rose-600/20 to-pink-500/10 border-rose-500/50 shadow-lg shadow-rose-950/30"
                              : "bg-slate-900/80 border-slate-800 hover:border-rose-500/30 hover:bg-slate-850"
                            }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-sm">
                                ⚙️
                              </div>
                              {role === "OPERATOR" && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Active ({currentSection || "hotpress"})
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">Operator Portal</h4>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              Machine sessions (Hot Press, Peeling, Dryer, Finishing).
                            </p>
                          </div>

                          {/* Fast section buttons */}
                          <div className="mt-3 grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleSwitchPortal("OPERATOR", "hotpress")}
                              disabled={switchingRole}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${role === "OPERATOR" && currentSection === "hotpress"
                                  ? "bg-rose-500/30 text-rose-200 border-rose-500/50"
                                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-rose-500/30"
                                }`}
                            >
                              <Flame size={10} className="text-orange-400" /> Hot Press
                            </button>
                            <button
                              onClick={() => handleSwitchPortal("OPERATOR", "peeling")}
                              disabled={switchingRole}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${role === "OPERATOR" && currentSection === "peeling"
                                  ? "bg-green-500/30 text-green-200 border-green-500/50"
                                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-green-500/30"
                                }`}
                            >
                              <TreePine size={10} className="text-green-400" /> Peeling
                            </button>
                            <button
                              onClick={() => handleSwitchPortal("OPERATOR", "dryer")}
                              disabled={switchingRole}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${role === "OPERATOR" && currentSection === "dryer"
                                  ? "bg-cyan-500/30 text-cyan-200 border-cyan-500/50"
                                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-500/30"
                                }`}
                            >
                              <Wind size={10} className="text-cyan-400" /> Dryer
                            </button>
                            <button
                              onClick={() => handleSwitchPortal("OPERATOR", "finishing")}
                              disabled={switchingRole}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${role === "OPERATOR" && currentSection === "finishing"
                                  ? "bg-purple-500/30 text-purple-200 border-purple-500/50"
                                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-purple-500/30"
                                }`}
                            >
                              <Scissors size={10} className="text-purple-400" /> Finishing
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <Shield size={16} />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Role impersonation is currently <strong className="text-slate-200 font-bold">disabled</strong>. Toggle the switch above to enable subordinate portal switching and testing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleImpersonation(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-md shrink-0 active:scale-95"
                    >
                      Enable Impersonation
                    </button>
                  </div>
                )}

                {/* Audit Attribution Guarantee Note */}
                <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-500/30 flex items-start gap-3">
                  <div className="p-1 bg-amber-400/20 text-amber-300 rounded-lg mt-0.5 shrink-0">
                    <Crown size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      Full Audit Attribution Guarantee
                    </h4>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                      Whenever you perform actions in subordinate portals (such as confirming orders, approving daily logs, creating production lists, or dispatching loads), they are explicitly recorded and displayed across all views with your Owner identity:{" "}
                      <span className="font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                        👑 {user.name} (Owner Action)
                      </span>
                      . This avoids team confusion on who authorized the change.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile & Security Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Info Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl">
              <div>
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <User size={18} />
                  </div>
                  Profile Details
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                    <User size={18} className="text-slate-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                        Full Name
                      </p>
                      <p className="text-white font-bold text-sm mt-0.5">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                    <Mail size={18} className="text-slate-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                        Email Address
                      </p>
                      <p className="text-white font-bold text-sm mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                    <Shield size={18} className="text-slate-500 shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                          System Role
                        </p>
                        <p className="text-white font-bold text-sm mt-0.5 flex items-center gap-2">
                          {realRole}
                          {realRole !== role && (
                            <span className="text-xs text-purple-400 font-semibold">
                              (Impersonating {role})
                            </span>
                          )}
                        </p>
                      </div>
                      {realRole === "OWNER" && (
                        <span className="text-amber-400">👑</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-6 mt-6 border-t border-slate-800">
                <button
                  onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
                  className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-2xl transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut size={18} />
                  Sign Out from Account
                </button>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <KeyRound size={18} />
                </div>
                Change Password
              </h2>

              {!isSuperUser && (role === "SUPERVISOR" || role === "OPERATOR") ? (
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <AlertTriangle size={18} /> Password Managed by Manager
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Worker and supervisor passwords are administered directly by your assigned company Manager. Please contact your manager to update your credentials.
                  </p>
                </div>
              ) : (
                <>
                  {success && (
                    <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5">
                      <Check size={18} className="text-emerald-400 shrink-0" />
                      <p className="text-xs font-bold text-emerald-300">{success}</p>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2.5">
                      <AlertTriangle size={18} className="text-red-400 shrink-0" />
                      <p className="text-xs font-bold text-red-300">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12 transition"
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12 transition"
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3 bg-slate-950/80 border rounded-xl text-white text-sm outline-none transition ${confirmPassword && confirmPassword !== newPassword
                            ? "border-red-500/80 focus:ring-1 focus:ring-red-500"
                            : "border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          }`}
                        placeholder="Re-enter new password"
                        required
                        minLength={6}
                      />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-red-400 text-xs mt-1 font-bold">
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !currentPassword ||
                        !newPassword ||
                        newPassword !== confirmPassword
                      }
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <KeyRound size={16} />
                          Update Password
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
