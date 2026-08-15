import React from 'react';

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 animate-pulse shadow-xs"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded w-1/3" />
            <div className="h-2.5 bg-slate-100 rounded w-1/4" />
          </div>
          <div className="w-16 h-6 bg-slate-100 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
};
