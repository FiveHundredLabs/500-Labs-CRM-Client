import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../models/domain';
import { userRepository, contactRepository, callLogRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { LoadingState } from '../../components/shared/LoadingState';
import { Trophy, Award } from 'lucide-react';
import usersSeed from '../../data/seed/users.json';

interface LeaderboardMember {
  user: User;
  totalCalls: number;
  interestedCount: number;
  rank: number;
}

// Color themes matching the infographic design reference
const ROW_GRADIENTS = [
  {
    bar: 'from-amber-400 via-yellow-400 to-amber-500',
    orb: 'from-yellow-300 via-amber-400 to-amber-600',
  },
  {
    bar: 'from-amber-500 via-orange-500 to-orange-600',
    orb: 'from-amber-400 via-orange-500 to-orange-700',
  },
  {
    bar: 'from-orange-500 via-rose-500 to-red-500',
    orb: 'from-orange-400 via-red-500 to-rose-700',
  },
  {
    bar: 'from-rose-500 via-pink-500 to-fuchsia-500',
    orb: 'from-rose-400 via-pink-500 to-fuchsia-700',
  },
  {
    bar: 'from-fuchsia-600 via-purple-600 to-indigo-500',
    orb: 'from-fuchsia-500 via-purple-600 to-indigo-700',
  },
  {
    bar: 'from-purple-600 via-indigo-600 to-blue-600',
    orb: 'from-purple-500 via-indigo-600 to-blue-700',
  },
  {
    bar: 'from-blue-600 via-indigo-500 to-violet-600',
    orb: 'from-blue-500 via-violet-600 to-purple-800',
  },
];

// Rich mock call stats for 7 Sri Lankan team members
const MOCK_CALL_STATS: Record<string, { totalCalls: number; interestedCount: number }> = {
  usr_mem_02: { totalCalls: 285, interestedCount: 78 }, // Kasun Perera (#1)
  usr_mem_06: { totalCalls: 260, interestedCount: 68 }, // Nuwan Wickramasinghe (#2)
  usr_mem_01: { totalCalls: 242, interestedCount: 62 }, // Pathum Nishshanka (Current User #3 - 62/242 calls)
  usr_mem_07: { totalCalls: 190, interestedCount: 42 }, // Ruwani Gunawardena (#4)
  usr_mem_08: { totalCalls: 175, interestedCount: 38 }, // Tharindu De Silva (#5)
  usr_mem_09: { totalCalls: 150, interestedCount: 31 }, // Amali Ratnayake (#6)
  usr_mem_10: { totalCalls: 130, interestedCount: 26 }, // Sanath Bandara (#7)
};

export const MemberLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<LeaderboardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const currentTeamId = user?.teamId || 'team_001';
        let teamUsers = await userRepository.getByTeamId(currentTeamId);

        // Ensure we always have 7 active team members loaded
        if (teamUsers.length < 7) {
          const fallbackSeed = (usersSeed as User[]).filter(
            (u) => u.role === 'TEAM_MEMBER' && (u.teamId === currentTeamId || u.teamId === 'team_001') && u.isActive
          );
          teamUsers = fallbackSeed;
        }

        const members = teamUsers.filter((u) => u.role === 'TEAM_MEMBER' && u.isActive).slice(0, 7);

        const [allContacts, allLogs] = await Promise.all([
          contactRepository.getByTeamId(currentTeamId),
          callLogRepository.getByTeamId(currentTeamId),
        ]);

        const list: LeaderboardMember[] = members.map((m) => {
          const mContacts = allContacts.filter((c) => c.allocatedToId === m.id);
          const mLogs = allLogs.filter((l) => l.teamMemberId === m.id);

          const mockStat = MOCK_CALL_STATS[m.id];
          const totalCalls = mLogs.length > 0 ? Math.max(mLogs.length, mockStat?.totalCalls || 90) : mockStat?.totalCalls || 90;
          const interestedCount =
            mContacts.filter((c) => c.status === 'INTERESTED').length > 0
              ? Math.max(mContacts.filter((c) => c.status === 'INTERESTED').length, mockStat?.interestedCount || 20)
              : mockStat?.interestedCount || 20;

          return {
            user: m,
            totalCalls,
            interestedCount,
            rank: 0,
          };
        });

        // Rank by interested calls (most interest calls first)
        list.sort((a, b) => b.interestedCount - a.interestedCount || b.totalCalls - a.totalCalls);

        list.forEach((item, idx) => {
          item.rank = idx + 1;
        });

        setRankings(list);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user]);

  if (loading) return <LoadingState rows={7} />;

  const topPerformer = rankings[0];
  const maxInterested = Math.max(...rankings.map((r) => r.interestedCount), 1);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Leaderboard &amp; Performance"
        description="Monthly ranking of tele-calling specialists by interested lead volume"
      />

      {/* Light Glassmorphic Winner Banner Card with Ambient Light Blue Corner Shades */}
      {topPerformer && (
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
                {topPerformer.user.fullName}
              </h2>
            </div>
          </div>

          {/* Right Stat Section with Frosted Glass Panel */}
          <div className="relative z-10 flex items-center justify-around w-full sm:w-auto gap-5 sm:gap-8 bg-white/75 backdrop-blur-md px-5 py-2.5 sm:py-3 rounded-xl border border-sky-100 text-center shadow-xs">
            <div>
              <div className="text-xl sm:text-3xl font-black text-blue-600 font-mono tracking-tight">
                {topPerformer.interestedCount}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Interested Calls
              </div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-slate-200/80" />
            <div>
              <div className="text-xl sm:text-3xl font-black text-slate-800 font-mono tracking-tight">
                {topPerformer.totalCalls}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Total Calls
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP SECTION: Infographic Bar Chart */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <span>This Month Interested Calls Ranking</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {rankings.map((item, index) => {
            const isCurrent = item.user.id === user?.id;
            const theme = ROW_GRADIENTS[index % ROW_GRADIENTS.length];
            const percentage = Math.max(Math.round((item.interestedCount / maxInterested) * 100), 25);

            const initials = item.user.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={item.user.id} className="flex items-center gap-2 sm:gap-4 group">
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
                    {/* Label inside the Bar */}
                    <div className="flex items-center gap-1.5 overflow-hidden pr-3 sm:pr-4">
                      <span className="font-extrabold text-[10px] sm:text-xs tracking-wider uppercase text-white drop-shadow-xs truncate">
                        {item.user.fullName}
                      </span>
                      {isCurrent && (
                        <span className="bg-white/30 text-white text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Glossy 3D Orb Badge on the Bar Tip */}
                    <div
                      className={`absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full shadow-md border-2 border-white flex items-center justify-center font-extrabold text-white text-[10px] sm:text-xs bg-gradient-to-tr ${theme.orb} ring-2 ring-slate-900/10 z-10 transition-transform group-hover:scale-110 shrink-0`}
                    >
                      {item.user.avatarUrl ? (
                        <img
                          src={item.user.avatarUrl}
                          alt={item.user.fullName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Outer Right Number of Interested Calls */}
                <div className="w-16 sm:w-28 text-right font-extrabold text-slate-900 text-xs sm:text-base font-mono tracking-tight shrink-0">
                  {item.interestedCount}{' '}
                  <span className="text-[10px] sm:text-xs font-normal text-slate-500 font-sans hidden sm:inline">
                    {item.interestedCount === 1 ? 'Interest' : 'Interests'}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* BOTTOM SECTION: Responsive Leaderboard Data Table (3 Columns) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Leaderboard Data Table</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            All employee monthly activity data ({rankings.length} Active Employees)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 sm:px-6">Name</th>
                  <th className="py-3 px-3.5 sm:px-6 text-center">Total Calls</th>
                  <th className="py-3 px-3.5 sm:px-6 text-right">Interest Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankings.map((item) => {
                  const isCurrent = item.user.id === user?.id;

                  return (
                    <tr
                      key={item.user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-blue-50/40 font-semibold' : ''
                      }`}
                    >
                      {/* Name Column */}
                      <td className="py-3 px-3.5 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-3">
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
                          <ProfileAvatar name={item.user.fullName} avatarUrl={item.user.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                              <span className="truncate">{item.user.fullName}</span>
                              {isCurrent && (
                                <span className="text-[9px] sm:text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-semibold shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-400 truncate">{item.user.city || 'Tele-caller'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Total Calls Column */}
                      <td className="py-3 px-3.5 sm:px-6 text-center font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        {item.totalCalls}
                      </td>

                      {/* Interest Calls Column */}
                      <td className="py-3 px-3.5 sm:px-6 text-right font-mono font-extrabold text-emerald-600 text-sm sm:text-base">
                        {item.interestedCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
