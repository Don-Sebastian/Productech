"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
} from "lucide-react";

interface AccountPageProps {
  allowedRole: string;
}

export default function AccountPage({ allowedRole }: AccountPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (
      status === "authenticated" &&
      (session?.user as any)?.role !== allowedRole
    )
      router.push("/");
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

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar user={user} />
      <main className="ml-0 md:ml-64 p-4 md:p-8 pb-24">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            My Account
          </h1>
          <p className="text-slate-400 text-sm">
            Manage your profile and security settings
          </p>
        </div>

        <div className="max-w-lg space-y-6">
          {/* Profile Info Card */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User size={18} className="text-cyan-400" />
              Profile Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                <User size={16} className="text-slate-500" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Name
                  </p>
                  <p className="text-white font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                <Mail size={16} className="text-slate-500" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Email
                  </p>
                  <p className="text-white font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                <Shield size={16} className="text-slate-500" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Role
                  </p>
                  <p className="text-white font-medium">{role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password / Contact Manager Card */}
          {role === "SUPERVISOR" || role === "OPERATOR" ? (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-amber-400" />
                Password Management
              </h2>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-200 font-medium text-sm mb-1">
                      Password changes are managed by your Manager
                    </p>
                    <p className="text-slate-400 text-sm">
                      If you have forgotten your password or need it changed, please contact your
                      assigned <strong className="text-slate-300">Manager</strong> and they will
                      reset it for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-amber-400" />
                Change Password
              </h2>

              {success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  <p className="text-sm text-emerald-300">{success}</p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 pr-12"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 pr-12"
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-500/50"
                        : "border-slate-600"
                    }`}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-red-400 text-xs mt-1">
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
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      Update Password
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 p-3 bg-slate-900/50 rounded-xl">
                <p className="text-slate-500 text-xs">
                  💡 <strong className="text-slate-400">Forgot your password?</strong>{" "}
                  Contact your{" "}
                  {role === "MANAGER"
                    ? "Owner"
                    : role === "OWNER"
                    ? "Admin"
                    : "administrator"}{" "}
                  to reset it for you.
                </p>
              </div>
            </div>
          )}

          {/* Sign Out Section (Mobile & Desktop) */}
          <div className="pt-4 border-t border-slate-800/50">
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
              className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <LogOut size={20} />
              Sign Out from Account
            </button>
            <p className="text-center text-slate-500 text-[10px] mt-3 uppercase tracking-tighter">
              Securely end your current session
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
