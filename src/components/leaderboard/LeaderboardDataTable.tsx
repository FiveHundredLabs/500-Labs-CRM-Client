import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { LeaderboardItem } from './types';
import { formatCurrency } from '../../utils/currency';
import { ChevronDown, PackageCheck } from 'lucide-react';

interface LeaderboardDataTableProps {
  items: LeaderboardItem[];
  tableTitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export const LeaderboardDataTable: React.FC<LeaderboardDataTableProps> = ({
  items,
  tableTitle = 'Delivered Sales Leaderboard',
  primaryLabel = 'Delivered Sales',
  secondaryLabel = 'Delivered Orders',
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allExpanded = items.length > 0 && items.every((i) => expandedIds.has(i.id));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(items.map((i) => i.id)));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <CardTitle className="text-base sm:text-lg">{tableTitle}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            All employee performance rankings based on delivered sales ({items.length} Active Employees)
          </CardDescription>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto cursor-pointer"
          >
            {allExpanded ? 'Collapse All Sales' : 'Expand All Sales'}
          </button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 sm:px-6">Name</th>
                <th className="py-3 px-4 sm:px-6 text-right">
                  {primaryLabel} / {secondaryLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isCurrent = !!item.isCurrentUser;
                const firstName = item.name.split(' ')[0];
                const isExpanded = expandedIds.has(item.id);
                const orderCount = item.deliveredOrdersList?.length ?? item.secondaryValue;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => toggleExpand(item.id)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${
                        isCurrent ? 'bg-blue-50/40 font-semibold' : ''
                      }`}
                    >
                      {/* Name Column */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-extrabold shrink-0 ${
                              item.rank === 1
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : item.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : item.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'text-slate-400 font-medium'
                            }`}
                          >
                            {item.rank}
                          </span>
                          <ProfileAvatar name={item.name} avatarUrl={item.avatarUrl} size="sm" />
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {firstName}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] sm:text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-600 transition-colors ml-1">
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-blue-600' : ''
                              }`}
                            />
                          </span>
                        </div>
                      </td>

                      {/* Metric Column */}
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-extrabold text-slate-900 text-xs sm:text-base whitespace-nowrap">
                        <span className="text-emerald-600 font-black">
                          {item.formattedPrimary || formatCurrency(item.primaryValue)}
                        </span>
                        <span className="text-slate-400 font-normal"> / </span>
                        <span className="text-slate-700 font-bold text-xs sm:text-sm">
                          {item.formattedSecondary || `${item.secondaryValue} ${item.secondaryLabel || 'orders'}`}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Sales Breakdown Sub-row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={2} className="py-3 px-4 sm:px-6">
                          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <PackageCheck className="w-4 h-4 text-emerald-600" />
                                <span>Delivered Sales Breakdown for {item.name}</span>
                              </span>
                              <span className="text-slate-500 text-[11px] font-medium">
                                {orderCount} Delivered Order{orderCount !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {item.deliveredOrdersList && item.deliveredOrdersList.length > 0 ? (
                              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {item.deliveredOrdersList.map((ord) => (
                                  <div
                                    key={ord.orderId}
                                    className="flex flex-wrap items-center justify-between text-xs bg-slate-50 hover:bg-slate-100/80 px-3 py-2 rounded-lg border border-slate-100 transition-colors gap-2"
                                  >
                                    <div className="flex items-center gap-2 font-mono font-medium text-slate-900">
                                      <span className="text-blue-600 font-bold">Order #{ord.orderNumber}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-slate-600 text-[11px]">
                                        Delivered: <strong className="text-slate-700">{ord.deliveredDateFormatted}</strong>
                                      </span>
                                    </div>
                                    <div className="font-mono font-extrabold text-emerald-700 text-xs sm:text-sm">
                                      Sale: {formatCurrency(ord.salesAmount)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-xs text-slate-400">
                                No delivered orders recorded in this selected period.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
