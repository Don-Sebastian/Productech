"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function GlobalActionLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activeMutations = 0;
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && 'url' in (args[0] as any) ? (args[0] as any).url : '');
      const method = (args[1]?.method?.toUpperCase()) || 'GET';
      
      // We only want to block the screen for modifying actions to prevent duplicate submissions.
      // background polling or page navigations (GETs) shouldn't block the UI.
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      const isInternal = url.includes('/_next/') || url.includes('/__nextjs');
      
      const shouldShowLoader = isMutation && !isInternal;

      if (shouldShowLoader) {
        activeMutations++;
        setLoading(true);
      }

      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        if (shouldShowLoader) {
          activeMutations--;
          if (activeMutations <= 0) {
            activeMutations = 0;
            setLoading(false);
          }
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3">
        <Loader2 className="animate-spin text-emerald-400" size={24} />
        <span className="text-white font-medium text-sm tracking-wide">Processing your action...</span>
      </div>
    </div>
  );
}
