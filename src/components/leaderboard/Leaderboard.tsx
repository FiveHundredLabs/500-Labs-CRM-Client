import React from 'react';
import { LeaderboardProps } from './types';
import { LeaderboardWinnerBanner } from './LeaderboardWinnerBanner';
import { LeaderboardInfographicChart } from './LeaderboardInfographicChart';
import { LeaderboardDataTable } from './LeaderboardDataTable';
import { LeaderboardCompactWidget } from './LeaderboardCompactWidget';
import { LoadingState } from '../shared/LoadingState';
import { Card } from '../ui/Card';

export const Leaderboard: React.FC<LeaderboardProps> = ({
  items,
  loading = false,
  compact = false,
  limit,
  title = 'Team Delivered Sales Leaderboard',
  chartTitle = 'Delivered Sales Revenue Ranking',
  tableTitle = 'Delivered Sales Leaderboard',
  primaryLabel = 'Delivered Sales',
  secondaryLabel = 'Delivered Orders',
  unitLabel = 'orders',
  onViewFullLeaderboard,
  emptyMessage = 'No leaderboard data available for ranking.',
}) => {
  const displayedItems = limit && limit > 0 ? items.slice(0, limit) : items;
  if (loading) {
    return <LoadingState rows={compact ? 4 : 7} />;
  }

  if (displayedItems.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-400 text-xs font-medium">
        {emptyMessage}
      </Card>
    );
  }

  if (compact) {
    return (
      <LeaderboardCompactWidget
        items={displayedItems}
        title={title}
        unitLabel={unitLabel}
        onViewFullLeaderboard={onViewFullLeaderboard}
      />
    );
  }

  const topPerformer = displayedItems.find((item) => item.rank === 1) || displayedItems[0];

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* 1. Winner Banner Card */}
      {topPerformer && (
        <LeaderboardWinnerBanner
          topPerformer={topPerformer}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
        />
      )}

      {/* 2. Infographic Bar Chart Ranking */}
      <LeaderboardInfographicChart
        items={displayedItems}
        chartTitle={chartTitle}
        unitLabel={unitLabel}
      />

      {/* 3. Responsive Leaderboard Data Table */}
      <LeaderboardDataTable
        items={displayedItems}
        tableTitle={tableTitle}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    </div>
  );
};
