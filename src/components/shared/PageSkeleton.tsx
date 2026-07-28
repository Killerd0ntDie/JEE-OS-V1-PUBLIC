import React from 'react';

/**
 * Reusable page skeleton with shimmer animation.
 * Shows a layout-matching placeholder during page transitions.
 */

const shimmerClass = "relative overflow-hidden bg-zinc-900/60 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-zinc-800/40 before:to-transparent";

function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`${shimmerClass} ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-pulse select-none">
      
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 pt-1 pb-1">
        <div className="space-y-2.5">
          <SkeletonBar className="h-3 w-28 rounded-md" />
          <SkeletonBar className="h-7 w-64 rounded-lg" />
          <SkeletonBar className="h-3.5 w-80 rounded-md" />
        </div>
        <div className="flex gap-3">
          <SkeletonBar className="h-9 w-20 rounded-xl" />
          <SkeletonBar className="h-9 w-20 rounded-xl" />
          <SkeletonBar className="h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - primary content */}
        <div className="lg:col-span-8 space-y-4">
          {/* Large card skeleton */}
          <SkeletonBar className="h-48 w-full rounded-2xl" />
          
          {/* Two smaller cards */}
          <div className="grid grid-cols-2 gap-4">
            <SkeletonBar className="h-28 w-full rounded-xl" />
            <SkeletonBar className="h-28 w-full rounded-xl" />
          </div>

          {/* List items */}
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/40">
                <SkeletonBar className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBar className="h-3.5 w-3/4 rounded-md" />
                  <SkeletonBar className="h-2.5 w-1/2 rounded-md" />
                </div>
                <SkeletonBar className="h-6 w-16 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column - sidebar content */}
        <div className="lg:col-span-4 space-y-4">
          <SkeletonBar className="h-36 w-full rounded-2xl" />
          <SkeletonBar className="h-24 w-full rounded-xl" />
          <SkeletonBar className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
