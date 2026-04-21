"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Shield, Loader2, ArrowRight, Lock, Mail, User } from "lucide-react";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  const router = useRouter();

  // On mount: check if system is already set up
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/setup/check");
        const data = await res.json();
        if (data.isSetUp) {
          setAlreadySetUp(true);
          setTimeout(() => router.replace("/login"), 2000);
        }
      } catch {}
      finally { setChecking(false); }
    }
    check();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-300/60 text-sm">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (alreadySetUp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-2xl mb-4 border border-amber-500/30">
            <Shield className="text-amber-400" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">System Already Configured</h2>
          <p className="text-blue-300/60 text-sm mb-6">An admin account already exists. Redirecting to login...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin Account Created!</h2>
            <p className="text-blue-300/60 text-sm mb-2">Log in to create your first company and owner.</p>
            <p className="text-blue-300/40 text-xs">Redirecting to login...</p>
            <div className="mt-6 animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + First Run Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600/20 rounded-2xl mb-4 backdrop-blur-sm border border-violet-500/30">
            <Shield className="text-violet-400" size={28} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CRPLY</h1>
          <p className="text-blue-300/70 text-sm">Production Management System</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <Shield size={12} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">First-Time Setup</span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-1">Create Admin Account</h2>
          <p className="text-blue-300/60 text-sm mb-6">The admin manages companies and assigns owners. You can create your first company after logging in.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3 items-start">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-200/80 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/50" size={16} />
                <input
                  type="text" name="name" placeholder="Admin Name" required
                  value={formData.name} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/80 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/50" size={16} />
                <input
                  type="email" name="email" placeholder="admin@crply.com" required
                  value={formData.email} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/50" size={16} />
                <input
                  type="password" name="password" placeholder="Min 6 characters" required minLength={6}
                  value={formData.password} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating Admin...
                </>
              ) : (
                <>
                  Create Admin Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/30 text-xs mt-6">This page is only accessible during first-time setup.</p>
      </div>
    </div>
  );
}
