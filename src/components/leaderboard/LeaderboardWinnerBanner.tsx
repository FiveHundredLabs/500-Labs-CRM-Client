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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/95 via-sky-50/85 to-blue-50/95 backdrop-blur-xl border border-sky-200/70 p-4 sm:p-6 text-slate-800 shadow-md shadow-blue-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Ambient Glowing Light Blue Corner Orbs */}
      <div className="absolute -top-12 -left-12 w-44 h-44 bg-sky-300/35 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-400/30 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-36 h-36 bg-indigo-300/20 rounded-full blur-xl pointer-events-none" />

      {/* Left Info Section */}
      <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/20 border border-white/60">
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

      {/* Right Stat Section with Frosted Glass Panel */}
      <div className="relative z-10 flex items-center justify-around w-full sm:w-auto gap-5 sm:gap-8 bg-white/75 backdrop-blur-md px-5 py-2.5 sm:py-3 rounded-xl border border-sky-100 text-center shadow-xs">
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
