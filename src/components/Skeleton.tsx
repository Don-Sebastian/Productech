"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  width, 
  height, 
  circle = false 
}) => {
  return (
    <div
      className={`animate-shimmer bg-slate-800 rounded-md ${className} ${circle ? "rounded-full" : ""}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
      }}
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton width={56} height={56} className="rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={14} />
      </div>
    </div>
    <div className="space-y-3 pt-4">
      <Skeleton height={8} className="rounded-full" />
      <div className="flex justify-between">
        <Skeleton width="30%" height={12} />
        <Skeleton width="20%" height={12} />
      </div>
    </div>
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4 w-full">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const StatSkeleton = () => (
  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
    <Skeleton width="50%" height={14} />
    <Skeleton width="80%" height={32} />
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4 w-full bg-slate-900/40 rounded-3xl p-4 border border-slate-800">
    <div className="flex gap-4 border-b border-slate-800 pb-4">
      <Skeleton width="20%" height={16} />
      <Skeleton width="30%" height={16} />
      <Skeleton width="20%" height={16} />
      <Skeleton width="15%" height={16} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        <Skeleton width="20%" height={14} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="20%" height={14} />
        <Skeleton width="15%" height={14} />
      </div>
    ))}
  </div>
);
