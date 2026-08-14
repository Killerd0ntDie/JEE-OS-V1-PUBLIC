import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-zinc-800/60 ${className}`}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start p-1 animate-in fade-in duration-500">
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col space-y-6">
        {/* Header Skeleton */}
        <div className="border-b border-zinc-900/80 pb-3 flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        
        {/* Mission Cards Skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 flex gap-4 items-start">
              <Skeleton className="w-5 h-5 rounded-md mt-1 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6">
        {/* Right column widgets skeleton */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
        
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
