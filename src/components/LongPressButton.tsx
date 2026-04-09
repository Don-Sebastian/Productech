"use client";

import { useState, useRef, useCallback, ReactNode } from "react";

interface LongPressButtonProps {
  onComplete: () => void;
  duration?: number; // ms, default 3000
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export default function LongPressButton({
  onComplete,
  duration = 1000,
  disabled = false,
  className = "",
  children,
}: LongPressButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const startHold = useCallback(() => {
    if (disabled) return;
    completedRef.current = false;
    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);

      if (pct >= 1 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setHolding(false);
        setProgress(0);
        onComplete();
      }
    }, 30);
  }, [disabled, duration, onComplete]);

  const cancelHold = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      disabled={disabled}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      {/* Progress overlay — fills from left to right */}
      {holding && (
        <div
          className="absolute inset-0 bg-white/15 transition-none pointer-events-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}

      {/* Circular progress ring overlay in center */}
      {holding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="40" height="40" className="drop-shadow-lg">
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
              transform="rotate(-90 20 20)"
              className="transition-none"
            />
          </svg>
        </div>
      )}

      {/* Content — slightly dim when holding */}
      <span className={`relative z-10 flex items-center justify-center gap-2 transition-opacity ${holding ? "opacity-60" : ""}`}>
        {children}
      </span>

      {/* "Hold" hint text */}
      {!holding && !disabled && (
        <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-white/30 uppercase tracking-widest pointer-events-none">
          hold to activate
        </span>
      )}
    </button>
  );
}
