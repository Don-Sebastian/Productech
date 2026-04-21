"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Shield, Building2, User, Loader2, ArrowRight, Lock, Mail } from "lucide-react";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    companyEmail: "",
    companyPhone: "",
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
          // System already has users — redirect to login after a brief moment
          setTimeout(() => router.replace("/login"), 2000);
        }
      } catch {
        // allow signup on error (fresh DB may not even have the table yet)
      } finally {
        setChecking(false);
      }
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

  // Loading state while checking setup
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

  // Already set up — block access
  if (alreadySetUp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-2xl mb-4 border border-amber-500/30">
            <Shield className="text-amber-400" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">System Already Configured</h2>
          <p className="text-blue-300/60 text-sm mb-6">An owner account already exists. Redirecting to login...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">System Initialized!</h2>
            <p className="text-blue-300/60 text-sm mb-2">Your company and owner account have been created.</p>
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4 backdrop-blur-sm border border-blue-500/30">
            <span className="text-2xl font-bold text-blue-400">C</span>
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
          <h2 className="text-2xl font-bold text-white mb-1">Initialize System</h2>
          <p className="text-blue-300/60 text-sm mb-6">Create the owner account and register your company</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3 items-start">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Owner Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-blue-400" />
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest">Owner Account</h3>
              </div>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/50" size={16} />
                <input
                  type="text" name="name" placeholder="Owner Full Name" required
                  value={formData.name} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/50" size={16} />
                <input
                  type="email" name="email" placeholder="owner@company.com" required
                  value={formData.email} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/50" size={16} />
                <input
                  type="password" name="password" placeholder="Password (min 6 chars)" required minLength={6}
                  value={formData.password} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                />
              </div>
            </div>

            {/* Company Section */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 mb-1 pt-4">
                <Building2 size={14} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Company Details</h3>
              </div>

              <input
                type="text" name="companyName" placeholder="Company Name" required
                value={formData.companyName} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
              />

              <input
                type="email" name="companyEmail" placeholder="company@email.com" required
                value={formData.companyEmail} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
              />

              <input
                type="tel" name="companyPhone" placeholder="Company Phone (optional)"
                value={formData.companyPhone} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  Initialize System
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/30 text-xs mt-6">This page is only accessible on first-time setup.</p>
      </div>
    </div>
  );
}
