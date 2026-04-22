"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function GlobalActionLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activeMutations = 0;
    let lastMutationTime = 0;
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && 'url' in (args[0] as any) ? (args[0] as any).url : '');
      const method = (args[1]?.method?.toUpperCase()) || 'GET';
      const isInternal = url.includes('/_next/') || url.includes('/__nextjs');
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      
      // Track mutations, OR a GET request if it fires within 500ms of a mutation 
      // (this catches sequential fetchData() refetches after an action)
      let shouldShowLoader = false;
      if (!isInternal && url.includes('/api/')) {
        if (isMutation) {
          shouldShowLoader = true;
        } else if (Date.now() - lastMutationTime < 800) {
          shouldShowLoader = true;
        }
      }

      if (shouldShowLoader) {
        activeMutations++;
        setLoading(true);
      }

      try {
        const response = await originalFetch.apply(this, args);
        if (isMutation) lastMutationTime = Date.now();
        return response;
      } finally {
        if (shouldShowLoader) {
          // Debounce removal to bridge the gap between POST ending and GET starting
          setTimeout(() => {
            activeMutations--;
            if (activeMutations <= 0) {
              activeMutations = 0;
              setLoading(false);
            }
          }, 200);
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
