import React from "react";
import { Skeleton } from "../ui/skeleton";

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col bg-background p-6 space-y-6">
      {/* Board Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* Board Columns Grid */}
      <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((colIndex) => (
          <div
            key={colIndex}
            className="flex w-72 shrink-0 flex-col rounded-xl border bg-card/60 p-3 space-y-3 backdrop-blur-sm"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-1">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>

            {/* Cards Skeleton */}
            <div className="space-y-2.5">
              {Array.from({ length: colIndex % 2 === 0 ? 3 : 2 }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-lg border bg-background/80 p-3 space-y-2 shadow-sm"
                >
                  <div className="flex gap-1.5">
                    <Skeleton className="h-2 w-10 rounded-full" />
                    <Skeleton className="h-2 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Card Button Placeholder */}
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
};
