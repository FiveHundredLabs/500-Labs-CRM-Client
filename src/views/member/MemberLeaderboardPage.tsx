import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userRepository, orderRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Leaderboard, LeaderboardItem } from '../../components/leaderboard';

export const MemberLeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const currentTeamId = user?.teamId;
        if (!currentTeamId) {
          setItems([]);
          return;
        }
        const [teamUsers, allOrders] = await Promise.all([
          userRepository.getByTeamId(currentTeamId),
          orderRepository.getByTeamId(currentTeamId),
        ]);

        const members = teamUsers.filter((u) => u.role === 'TEAM_MEMBER' && u.isActive);

        const list: LeaderboardItem[] = members.map((m: any) => {
          const mOrders = allOrders.filter((o) => o.teamMemberId === m.id);
          const deliveredOrders = mOrders.filter((o) => o.status === 'DELIVERED');
          const deliveredSalesAmount = m.deliveredSalesAmount !== undefined
            ? Number(m.deliveredSalesAmount)
            : deliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
          const deliveredOrdersCount = m.deliveredOrdersCount !== undefined
            ? Number(m.deliveredOrdersCount)
            : deliveredOrders.length;
          const totalOrdersCount = m.totalOrdersCount !== undefined
            ? Number(m.totalOrdersCount)
            : mOrders.length;

          return {
            id: m.id,
            rank: 0,
            name: m.fullName,
            avatarUrl: m.avatarUrl,
            isCurrentUser: m.id === user?.id,
            primaryValue: deliveredSalesAmount,
            secondaryValue: deliveredOrdersCount,
            primaryLabel: 'Delivered Sales',
            secondaryLabel: 'Delivered Orders',
            unitLabel: 'orders',
          };
        });

        // Rank primarily by Total Delivered Sales Value (highest revenue first)
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
        title="Delivered Sales Leaderboard"
        description="Team member rankings based on total verified delivered sales revenue (LKR)"
      />

      <Leaderboard
        items={items}
        loading={loading}
        chartTitle="Delivered Sales Revenue Ranking"
        tableTitle="Delivered Sales Performance Table"
        primaryLabel="Delivered Sales"
        secondaryLabel="Delivered Orders"
        unitLabel="orders"
      />
    </div>
  );
};
