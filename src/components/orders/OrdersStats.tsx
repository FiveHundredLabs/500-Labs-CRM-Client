import React from 'react';

export interface OrdersStatsProps {
  dispatchedCount: number;
  deliveredCount: number;
  rejectedCount: number;
  statusFilter: 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL';
  onSelectStatusFilter: (status: 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL') => void;
}

export const OrdersStats: React.FC<OrdersStatsProps> = ({
  dispatchedCount,
  deliveredCount,
  rejectedCount,
  statusFilter,
  onSelectStatusFilter,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {/* Dispatched Card */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter('DISPATCHED')}
        className={`
          p-3 sm:p-4 rounded-xl border text-center transition-all cursor-pointer
          select-none relative overflow-hidden
          ${
            statusFilter === 'DISPATCHED'
              ? 'border-2 border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }
        `}
      >
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
          Current Dispatched Count
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-slate-900">
          {dispatchedCount}
        </div>
      </button>

      {/* Delivered Card */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter('DELIVERED')}
        className={`
          p-3 sm:p-4 rounded-xl border text-center transition-all cursor-pointer
          select-none relative overflow-hidden
          ${
            statusFilter === 'DELIVERED'
              ? 'border-2 border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }
        `}
      >
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
          Total Delivered Orders
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-slate-900">
          {deliveredCount}
        </div>
      </button>

      {/* Rejected Card */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter('REJECTED')}
        className={`
          p-3 sm:p-4 rounded-xl border text-center transition-all cursor-pointer
          select-none relative overflow-hidden
          ${
            statusFilter === 'REJECTED'
              ? 'border-2 border-red-500 bg-red-50/70 ring-2 ring-red-500/20 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
          }
        `}
      >
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-700">
          Total Rejected Orders
        </div>
        <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-extrabold text-slate-900">
          {rejectedCount}
        </div>
      </button>
    </div>
  );
};
