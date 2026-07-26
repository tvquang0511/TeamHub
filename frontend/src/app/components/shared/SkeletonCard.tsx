import React from "react";

export const SkeletonCard: React.FC = () => {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 shadow-xs animate-pulse">
      <div className="flex gap-1.5 mb-2.5">
        <div className="h-2 w-10 rounded bg-muted" />
        <div className="h-2 w-8 rounded bg-muted" />
      </div>
      <div className="h-4 w-3/4 rounded bg-muted mb-2" />
      <div className="h-3 w-1/2 rounded bg-muted/60" />
      <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
        <div className="h-3 w-12 rounded bg-muted/60" />
        <div className="h-5 w-5 rounded-full bg-muted" />
      </div>
    </div>
  );
};
