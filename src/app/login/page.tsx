"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check if system is set up; if not, redirect to signup
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup/check");
        const data = await res.json();
        if (!data.isSetUp) {
          router.replace("/signup");
          return;
        }
      } catch {}
    }
    checkSetup();
  }, [router]);

  // If already logged in, redirect to role dashboard
  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role;
      redirectByRole(role);
    }
  }, [session]);

  function redirectByRole(role: string) {
    const paths: Record<string, string> = {
      ADMIN: "/admin",
      OWNER: "/owner",
      MANAGER: "/manager",
      SUPERVISOR: "/supervisor",
      OPERATOR: "/operator",
    };
    router.push(paths[role] || "/login");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Validate credentials via custom endpoint for proper error messages
      const validateRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const validateData = await validateRes.json();

      if (!validateRes.ok) {
        setError(validateData.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Step 2: Credentials are valid, now sign in via NextAuth
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // This shouldn't happen since we pre-validated, but handle it just in case
        setError("Sign-in failed. Please try again.");
      } else if (result?.ok) {
        // Redirect based on role from validation response
        const role = validateData.user?.role;
        if (role) {
          redirectByRole(role);
        } else {
          // Fallback: fetch session
          const res = await fetch("/api/auth/session");
          const sessionData = await res.json();
          const sessionRole = sessionData?.user?.role;
          if (sessionRole) {
            redirectByRole(sessionRole);
          } else {
            router.push("/dashboard");
          }
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4 backdrop-blur-sm border border-blue-500/30">
            <span className="text-2xl font-bold text-blue-400">C</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">CRPLY</h1>
          <p className="text-blue-300/70 text-sm">Production Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-1">
            Welcome Back
          </h2>
          <p className="text-blue-300/60 text-sm mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3 items-start">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-200/80 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/50" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/80 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400/50" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
