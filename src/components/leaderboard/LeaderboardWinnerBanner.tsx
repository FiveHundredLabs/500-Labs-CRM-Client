import React from 'react';
import { Trophy, Award } from 'lucide-react';
import { LeaderboardItem } from './types';

interface LeaderboardWinnerBannerProps {
  topPerformer: LeaderboardItem;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export const LeaderboardWinnerBanner: React.FC<LeaderboardWinnerBannerProps> = ({
  topPerformer,
  primaryLabel = 'Interested',
  secondaryLabel = 'Total Calls',
}) => {
  const firstName = topPerformer.name.split(' ')[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/50 via-blue-50/30 to-white border border-slate-200 p-4 sm:p-6 text-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left Info Section */}
      <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs border border-white">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-xs" />
        </div>
        <div>
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>#1 Top Performer This Month</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {firstName}
          </h2>
        </div>
      </div>

      {/* Right Stat Section */}
      <div className="relative z-10 flex items-center justify-around w-full sm:w-auto gap-5 sm:gap-8 bg-white px-5 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-center shadow-xs">
        <div>
          <div className="text-xl sm:text-3xl font-black text-blue-600 font-mono tracking-tight">
            {topPerformer.primaryValue}/{topPerformer.secondaryValue}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            {primaryLabel} / {secondaryLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

