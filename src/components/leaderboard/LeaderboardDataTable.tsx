import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { LeaderboardItem } from './types';

interface LeaderboardDataTableProps {
  items: LeaderboardItem[];
  tableTitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export const LeaderboardDataTable: React.FC<LeaderboardDataTableProps> = ({
  items,
  tableTitle = 'Leaderboard Data Table',
  primaryLabel = 'Interested',
  secondaryLabel = 'Total Calls',
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">{tableTitle}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          All employee monthly activity data ({items.length} Active Employees)
        </CardDescription>
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

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrent ? 'bg-blue-50/40 font-semibold' : ''
                    }`}
                  >
                    {/* Name Column (First Name Only) */}
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
                      </div>
                    </td>

                    {/* Metric Column */}
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                      <span className="text-emerald-600 font-black">{item.primaryValue}</span>
                      <span className="text-slate-400 font-normal"> / </span>
                      <span className="text-slate-700 font-bold">{item.secondaryValue}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
