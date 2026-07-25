import React from "react";
import { Skeleton } from "../ui/skeleton";

export const WorkspaceListSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Grid of Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div
            key={index}
            className="flex flex-col justify-between rounded-xl border bg-card p-5 space-y-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex -space-x-2">
                <Skeleton className="h-7 w-7 rounded-full ring-2 ring-background" />
                <Skeleton className="h-7 w-7 rounded-full ring-2 ring-background" />
                <Skeleton className="h-7 w-7 rounded-full ring-2 ring-background" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
