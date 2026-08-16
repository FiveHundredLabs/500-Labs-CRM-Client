import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../models/domain';
import { userRepository, contactRepository, callLogRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Leaderboard, LeaderboardItem } from '../../components/leaderboard';
import usersSeed from '../../data/seed/users.json';

export const MemberLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const currentTeamId = user?.teamId || 'team_001';
        let teamUsers = await userRepository.getByTeamId(currentTeamId);

        // Ensure active team members are loaded
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

        const list: LeaderboardItem[] = members.map((m) => {
          const mContacts = allContacts.filter((c) => c.allocatedToId === m.id);
          const mLogs = allLogs.filter((l) => l.teamMemberId === m.id);

          const totalCalls = mLogs.length > 0 ? mLogs.length : mContacts.reduce((acc, c) => acc + (c.attemptCount || 1), 0);
          const interestedCount = mContacts.filter((c) => c.status === 'INTERESTED').length;

          return {
            id: m.id,
            rank: 0,
            name: m.fullName,
            avatarUrl: m.avatarUrl,
            isCurrentUser: m.id === user?.id,
            primaryValue: interestedCount,
            secondaryValue: totalCalls,
            primaryLabel: 'Interested',
            secondaryLabel: 'Total Calls',
            unitLabel: 'calls',
          };
        });

        // Rank by interested calls (most interest calls first)
        list.sort((a, b) => b.primaryValue - a.primaryValue || b.secondaryValue - a.secondaryValue);

        list.forEach((item, idx) => {
          item.rank = idx + 1;
        });

        setItems(list);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Leaderboard &amp; Performance"
        description="Monthly ranking of tele-calling specialists by interested lead volume"
      />

      <Leaderboard
        items={items}
        loading={loading}
        chartTitle="This Month Interested Calls Ranking"
        tableTitle="Leaderboard Data Table"
        primaryLabel="Interested"
        secondaryLabel="Total Calls"
        unitLabel="calls"
      />
    </div>
  );
};
