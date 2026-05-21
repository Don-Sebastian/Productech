"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Factory, Package, Layers, TreePine, 
  TrendingUp, ShieldCheck, 
  ChevronRight, Send, MapPin, Phone, Mail 
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup/check");
        const data = await res.json();

        if (!data.isSetUp) {
          router.replace("/signup");
          return;
        }

        if (status === "loading") return;

        if (session?.user) {
          const role = (session.user as any).role;
          const paths: Record<string, string> = {
            ADMIN: "/admin",
            OWNER: "/owner",
            MANAGER: "/manager",
            SUPERVISOR: "/supervisor",
            OPERATOR: "/operator",
          };
          router.replace(paths[role] || "/login");
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }

    checkSetup();
  }, [session, status, router]);

  if (checking || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Factory className="animate-pulse text-amber-500 w-16 h-16 mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 p-2 rounded-xl">
                <Factory className="text-slate-900 w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">CRPLY</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-sm font-semibold text-slate-400 hover:text-amber-400 transition-colors">Features</a>
              <a href="#contact" className="text-sm font-semibold text-slate-400 hover:text-amber-400 transition-colors">Contact</a>
            </div>
            <div>
              <Link href="/login" className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:ring-2 hover:ring-amber-500/50">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Built for Kerala's Plywood Industry
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
            Modernize Your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Plywood Production</span>
          </h1>
          
          <p className="mt-4 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium mb-10">
            The ultimate production management system designed specifically for plywood factories. Track hot press, peeling, inventory, and dispatch in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 px-8 py-4 rounded-2xl font-black text-lg transition-transform hover:scale-105 shadow-lg shadow-amber-500/25">
              Access Dashboard <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#contact" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-slate-700 transition-colors">
              Enquire Now
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-black text-white mb-1">100%</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paperless</p>
            </div>
            <div>
              <p className="text-4xl font-black text-amber-400 mb-1">Real-time</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monitoring</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white mb-1">4+</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Role Dashboards</p>
            </div>
            <div>
              <p className="text-4xl font-black text-emerald-400 mb-1">Zero</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stock Surprises</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Everything you need to <br/><span className="text-amber-500">run your factory</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Replace messy WhatsApp groups and paper registers with a centralized, intelligent system.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Factory, title: "Live Machine Tracking", desc: "Monitor Hot Press, Peeling, and Dryer sessions in real-time. See exactly what's being produced right now.", color: "text-amber-400", bg: "bg-amber-500/10" },
              { icon: Layers, title: "Smart Inventory", desc: "Automated stock deduction as production happens. Low stock alerts for glue and raw materials to prevent downtime.", color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: Package, title: "Order & Dispatch", desc: "Manage customer orders, track production progress against targets, and streamline the dispatch process.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { icon: TreePine, title: "Peeling Management", desc: "Track logs used and veneer produced. Calculate yield and minimize wastage at the source.", color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { icon: ShieldCheck, title: "Role-Based Access", desc: "Dedicated interfaces for Operators, Supervisors, Managers, and Owners. Everyone sees exactly what they need.", color: "text-purple-400", bg: "bg-purple-500/10" },
              { icon: TrendingUp, title: "Production Analytics", desc: "Daily production reports, machine efficiency metrics, and material usage trends at your fingertips.", color: "text-rose-400", bg: "bg-rose-500/10" },
            ].map((feature, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/80 transition-all hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Ready to upgrade your factory?
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Get in touch with us to schedule a demo and see how CRPLY can transform your plywood production process.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <MapPin className="text-amber-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Location</p>
                    <p className="text-slate-400 text-sm">Perumbavoor, Kerala, India</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <Phone className="text-amber-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Phone</p>
                    <p className="text-slate-400 text-sm">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                    <Mail className="text-amber-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Email</p>
                    <p className="text-slate-400 text-sm">hello@crply.in</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full"></div>
              <h3 className="text-2xl font-bold text-white mb-6">Send an Enquiry</h3>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Enquiry submitted! We will contact you soon."); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">First Name</label>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" placeholder="John" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Last Name</label>
                    <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Company Name</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" placeholder="Your Plywood Co." required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Phone Number</label>
                  <input type="tel" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" placeholder="+91" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Message</label>
                  <textarea rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors" placeholder="Tell us about your factory..." required></textarea>
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl transition-colors">
                  <Send className="w-5 h-5" /> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Factory className="text-amber-500 w-6 h-6" />
            <span className="text-xl font-black tracking-tight text-white">CRPLY</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} CRPLY Production Systems. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="text-slate-500 hover:text-white text-sm font-semibold transition-colors">Login</Link>
            <Link href="/signup" className="text-slate-500 hover:text-white text-sm font-semibold transition-colors">Signup</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
