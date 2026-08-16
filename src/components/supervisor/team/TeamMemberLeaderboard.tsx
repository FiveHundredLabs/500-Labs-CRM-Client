import React from 'react';
import { LeaderboardMemberStats } from '../../../services/supervisorAnalyticsService';
import { Leaderboard } from '../../leaderboard';

export interface TeamMemberLeaderboardProps {
  leaderboard: LeaderboardMemberStats[];
  compact?: boolean;
  title?: string;
  description?: string;
}

export const TeamMemberLeaderboard: React.FC<TeamMemberLeaderboardProps> = ({
  leaderboard,
  compact = false,
  title = 'Team Member Performance Leaderboard',
}) => {
  const items = leaderboard.map((m) => ({
    id: m.memberId,
    rank: m.rank,
    name: m.memberName,
    avatarUrl: m.avatarUrl,
    primaryValue: m.deliveredOrders,
    secondaryValue: m.totalOrders,
    primaryLabel: 'Delivered',
    secondaryLabel: 'Handled Orders',
    unitLabel: 'orders',
  }));

  return (
    <Leaderboard
      items={items}
      compact={compact}
      title={title}
      chartTitle="Team Member Delivered Orders Ranking"
      tableTitle="Team Performance Data Table"
      primaryLabel="Delivered"
      secondaryLabel="Total Orders"
      unitLabel="orders"
    />
  );
};
