"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Flame, Clock } from "lucide-react";

export default function HotPressTimer() {
  const [timerType, setTimerType] = useState<"cook" | "cool" | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0); // seconds remaining
  const [timerTotal, setTimerTotal] = useState(0); // total seconds
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmPlayed = useRef(false);

  useEffect(() => {
    const checkTimer = () => {
      const stored = localStorage.getItem("crply_hotpress_timer");
      if (!stored) {
        if (timerType !== null) setTimerType(null);
        return;
      }
      try {
        const parsed = JSON.parse(stored);
        if (parsed.endTime && parsed.type && parsed.totalSecs) {
          const remaining = Math.max(0, Math.floor((parsed.endTime - Date.now()) / 1000));
          
          if (timerType !== parsed.type) setTimerType(parsed.type);
          if (timerTotal !== parsed.totalSecs) setTimerTotal(parsed.totalSecs);
          setTimerRemaining(remaining);
          
          if (remaining <= 0 && !parsed.expiredHandled) {
            setTimerExpired(true);
            if (!alarmPlayed.current) {
              alarmPlayed.current = true;
              try {
                const ctx = new AudioContext();
                const playBeep = (freq: number, delay: number) => {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.frequency.value = freq;
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  gain.gain.value = 0.3;
                  osc.start(ctx.currentTime + delay);
                  osc.stop(ctx.currentTime + delay + 0.2);
                };
                playBeep(880, 0); playBeep(880, 0.3); playBeep(1100, 0.6);
              } catch {}
            }
            // Mark as handled so alarm doesn't repeat on reload
            localStorage.setItem("crply_hotpress_timer", JSON.stringify({ ...parsed, expiredHandled: true }));
          } else if (remaining <= 0) {
            setTimerExpired(true);
          } else {
            setTimerExpired(false);
            alarmPlayed.current = false;
          }
        }
      } catch {}
    };

    checkTimer();
    timerRef.current = setInterval(checkTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerType, timerTotal]);

  const dismissTimer = () => {
    setTimerType(null);
    setTimerRemaining(0);
    setTimerExpired(false);
    localStorage.removeItem("crply_hotpress_timer");
  };

  if (!timerType || (timerRemaining <= 0 && !timerExpired)) return null;

  return (
    <div className={`rounded-2xl p-4 border ${
      timerExpired 
        ? "bg-red-500/10 border-red-500/40 animate-pulse" 
        : timerType === "cook" 
          ? "bg-orange-500/10 border-orange-500/30" 
          : "bg-blue-500/10 border-blue-500/30"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {timerExpired ? (
            <AlertTriangle size={18} className="text-red-400" />
          ) : timerType === "cook" ? (
            <Flame size={18} className="text-orange-400" />
          ) : (
            <Clock size={18} className="text-blue-400" />
          )}
          <span className={`text-xs font-black uppercase tracking-widest ${
            timerExpired ? "text-red-400" : timerType === "cook" ? "text-orange-400" : "text-blue-400"
          }`}>{timerExpired ? "TIME'S UP!" : timerType === "cook" ? "COOKING TIMER" : "COOLING TIMER"}</span>
        </div>
        <button onClick={dismissTimer}
          className="text-slate-500 text-[10px] font-bold hover:text-white">DISMISS</button>
      </div>
      <div className="text-center">
        <p className={`text-4xl font-black tracking-tight ${
          timerExpired ? "text-red-400" : "text-white"
        }`}>
          {timerExpired ? "00:00" : `${String(Math.floor(timerRemaining / 60)).padStart(2, "0")}:${String(timerRemaining % 60).padStart(2, "0")}`}
        </p>
        {!timerExpired && timerTotal > 0 && (
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              timerType === "cook" ? "bg-orange-500" : "bg-blue-500"
            }`} style={{ width: `${((timerTotal - timerRemaining) / timerTotal) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
