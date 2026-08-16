import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trophy, ArrowRight } from 'lucide-react';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { LeaderboardItem } from './types';

interface LeaderboardCompactWidgetProps {
  items: LeaderboardItem[];
  title?: string;
  unitLabel?: string;
  onViewFullLeaderboard?: () => void;
}

export const LeaderboardCompactWidget: React.FC<LeaderboardCompactWidgetProps> = ({
  items,
  title = 'Team Leaderboard',
  unitLabel = 'calls',
  onViewFullLeaderboard,
}) => {
  const topPerformer = items.find((i) => i.rank === 1) || items[0];
  const currentUserBoardMember = items.find((i) => i.isCurrentUser);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-slate-900 text-base">
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{title}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {/* 1. TOP POSITION (#1 RANKED USER) */}
        {topPerformer && (
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-50/50 to-sky-50/60 border border-amber-200/90 rounded-2xl space-y-2.5 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {/* Profile Image with Golden #1 Badge */}
                <div className="relative shrink-0">
                  <ProfileAvatar
                    name={topPerformer.name}
                    avatarUrl={topPerformer.avatarUrl}
                    size="md"
                    className="border-2 border-amber-400 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                    #1
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Trophy className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>Top Performer</span>
                  </div>
                  {/* First Name */}
                  <div className="text-base font-extrabold text-slate-900 leading-tight truncate">
                    {topPerformer.name.split(' ')[0]}
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-blue-700 font-mono leading-none">
                  {topPerformer.primaryValue}/{topPerformer.secondaryValue}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-1 whitespace-nowrap">
                  {unitLabel}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CURRENT LOGGED-IN USER RANK SECTION OR TOP 2/3 PREVIEW */}
        {currentUserBoardMember ? (
          <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                #{currentUserBoardMember.rank}
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-xs">
                  Your Rank: <span className="font-bold text-blue-600">#{currentUserBoardMember.rank} in Team</span>
                </div>
                <div className="text-[11px] text-slate-500">{currentUserBoardMember.name.split(' ')[0]}</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono font-bold text-slate-900 text-xs">
                {currentUserBoardMember.primaryValue}/{currentUserBoardMember.secondaryValue} {unitLabel}
              </div>
              <div className="text-[10px] text-slate-400">Your Progress</div>
            </div>
          </div>
        ) : (
          /* Top 2 & 3 preview list if no current user match */
          <div className="space-y-2">
            {items.slice(1, 4).map((item) => (
              <div key={item.id} className="p-2.5 bg-slate-50/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{item.rank}
                  </span>
                  <ProfileAvatar name={item.name} avatarUrl={item.avatarUrl} size="sm" />
                  <span className="font-semibold text-slate-800 text-xs truncate">
                    {item.name.split(' ')[0]}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 text-xs">
                  {item.primaryValue}/{item.secondaryValue} <span className="text-[10px] text-slate-500 font-sans">{unitLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {onViewFullLeaderboard && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={onViewFullLeaderboard}
          >
            View Full Leaderboard
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
