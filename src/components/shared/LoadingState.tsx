import React from 'react';

export interface LoadingStateProps {
  rows?: number;
  /** Set to false if page does not need KPI stat cards skeleton */
  showStats?: boolean;
  /** Set to false if page does not need header skeleton */
  showHeader?: boolean;
  /** Layout style: 'full' (default full page skeleton) | 'rows-only' (just table/row items) */
  variant?: 'full' | 'rows-only';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 5,
  showStats = true,
  showHeader = true,
  variant = 'full',
}) => {
  if (variant === 'rows-only') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-200/70 animate-shimmer shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="h-3.5 bg-slate-200/80 animate-shimmer rounded w-1/3 max-w-[200px]" />
                <div className="h-2.5 bg-slate-200/50 animate-shimmer rounded w-1/4 max-w-[140px]" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-20 h-6 bg-slate-200/60 animate-shimmer rounded-full hidden sm:block" />
              <div className="w-16 h-4 bg-slate-200/70 animate-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in">
      {/* 1. Page Header Skeleton */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="space-y-2">
            <div className="h-7 sm:h-8 w-52 sm:w-72 bg-slate-200/80 animate-shimmer rounded-xl" />
            <div className="h-3.5 sm:h-4 w-72 sm:w-96 bg-slate-200/50 animate-shimmer rounded-lg" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-24 sm:w-28 bg-slate-200/70 animate-shimmer rounded-xl" />
            <div className="h-9 w-28 sm:w-32 bg-slate-200/80 animate-shimmer rounded-xl hidden sm:block" />
          </div>
        </div>
      )}

      {/* 2. Top Metric / KPI Summary Cards Skeleton */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5].map((cardIdx) => (
            <div
              key={cardIdx}
              className={`bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 shadow-2xs space-y-3 ${
                cardIdx === 5 ? 'col-span-2 sm:col-span-1 lg:hidden xl:block' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-3 w-16 bg-slate-200/70 animate-shimmer rounded" />
                <div className="w-8 h-8 rounded-xl bg-slate-200/60 animate-shimmer shrink-0" />
              </div>
              <div className="h-6 sm:h-7 w-28 bg-slate-200/90 animate-shimmer rounded-lg" />
              <div className="h-2.5 w-20 bg-slate-200/50 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 3. Search & Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="h-10 w-full sm:w-72 bg-white border border-slate-200/80 rounded-xl animate-shimmer shadow-2xs" />
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-24 bg-white border border-slate-200/80 rounded-xl animate-shimmer shadow-2xs" />
          <div className="h-9 w-28 bg-white border border-slate-200/80 rounded-xl animate-shimmer shadow-2xs" />
        </div>
      </div>

      {/* 4. Structured Table / Content Container Skeleton */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="h-11 bg-slate-50/90 border-b border-slate-200/80 px-4 sm:px-5 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-4 h-4 rounded bg-slate-200/70 animate-shimmer" />
            <div className="h-3 w-28 bg-slate-200/70 animate-shimmer rounded" />
            <div className="h-3 w-24 bg-slate-200/60 animate-shimmer rounded hidden md:block" />
          </div>
          <div className="flex items-center gap-6">
            <div className="h-3 w-16 bg-slate-200/60 animate-shimmer rounded hidden sm:block" />
            <div className="h-3 w-16 bg-slate-200/70 animate-shimmer rounded" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-200/70 animate-shimmer shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 bg-slate-200/80 animate-shimmer rounded w-2/5 max-w-[220px]" />
                  <div className="h-2.5 bg-slate-200/50 animate-shimmer rounded w-1/4 max-w-[150px]" />
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <div className="w-20 h-6 bg-slate-200/60 animate-shimmer rounded-full hidden sm:block" />
                <div className="w-20 h-3.5 bg-slate-200/70 animate-shimmer rounded text-right" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

