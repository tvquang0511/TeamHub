import React from "react";
import { FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderOpen,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card/40 backdrop-blur-xs animate-in fade-in-50 duration-300 ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4 shadow-inner ring-1 ring-border/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
