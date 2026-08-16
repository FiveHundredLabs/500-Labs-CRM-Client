import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Trophy } from 'lucide-react';
import { LeaderboardItem, ROW_GRADIENTS } from './types';

interface LeaderboardInfographicChartProps {
  items: LeaderboardItem[];
  chartTitle?: string;
  unitLabel?: string;
}

export const LeaderboardInfographicChart: React.FC<LeaderboardInfographicChartProps> = ({
  items,
  chartTitle = 'This Month Interested Calls Ranking',
  unitLabel = 'calls',
}) => {
  const maxPrimary = Math.max(...items.map((i) => i.primaryValue), 1);

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          <span>{chartTitle}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-6">
        {items.map((item, index) => {
          const isCurrent = !!item.isCurrentUser;
          const theme = ROW_GRADIENTS[index % ROW_GRADIENTS.length];
          const percentage = Math.max(Math.round((item.primaryValue / maxPrimary) * 100), 25);
          const firstName = item.name.split(' ')[0];

          const initials = item.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div key={item.id} className="flex items-center gap-2 sm:gap-4 group">
              {/* Rank Badge */}
              <div className="w-5 sm:w-6 text-center font-extrabold text-slate-400 text-[11px] sm:text-xs shrink-0">
                #{item.rank}
              </div>

              {/* Horizontal Bar Track Container */}
              <div className="flex-1 bg-slate-100/90 h-8 sm:h-10 rounded-full relative flex items-center p-0.5 shadow-inner min-w-0">
                {/* Colored Gradient Bar */}
                <div
                  className={`h-full bg-gradient-to-r ${theme.bar} rounded-full flex items-center justify-between px-2.5 sm:px-4 relative transition-all duration-700 ease-out shadow-sm min-w-[85px]`}
                  style={{ width: `${percentage}%` }}
                >
                  {/* Label inside the Bar (First Name Only) */}
                  <div className="flex items-center gap-1.5 overflow-hidden pr-3 sm:pr-4">
                    <span className="font-extrabold text-[10px] sm:text-xs tracking-wider uppercase text-white drop-shadow-xs truncate">
                      {firstName}
                    </span>
                    {isCurrent && (
                      <span className="bg-white/30 text-white text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0">
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Glossy 3D Orb Badge on the Bar Tip */}
                  <div
                    className={`absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full shadow-md border-2 border-white flex items-center justify-center font-extrabold text-white text-[10px] sm:text-xs bg-gradient-to-tr ${theme.orb} ring-2 ring-slate-200 z-10 transition-transform group-hover:scale-110 shrink-0`}
                  >
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={firstName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Outer Right Number of Metric */}
              <div className="w-20 sm:w-32 text-right font-extrabold text-slate-900 text-xs sm:text-base font-mono tracking-tight shrink-0">
                <span className="text-emerald-600 font-black">{item.primaryValue}</span>
                <span className="text-slate-400 font-normal">/</span>
                <span className="text-slate-700 font-bold">{item.secondaryValue}</span>{' '}
                <span className="text-[10px] sm:text-xs font-normal text-slate-500 font-sans hidden sm:inline">
                  {unitLabel}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
