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
  title = 'Team Leaderboard',
  chartTitle = 'This Month Interested Calls Ranking',
  tableTitle = 'Leaderboard Data Table',
  primaryLabel = 'Interested',
  secondaryLabel = 'Total Calls',
  unitLabel = 'calls',
  onViewFullLeaderboard,
  emptyMessage = 'No leaderboard data available for ranking.',
}) => {
  if (loading) {
    return <LoadingState rows={compact ? 4 : 7} />;
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-400 text-xs font-medium">
        {emptyMessage}
      </Card>
    );
  }

  if (compact) {
    return (
      <LeaderboardCompactWidget
        items={items}
        title={title}
        unitLabel={unitLabel}
        onViewFullLeaderboard={onViewFullLeaderboard}
      />
    );
  }

  const topPerformer = items.find((item) => item.rank === 1) || items[0];

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
        items={items}
        chartTitle={chartTitle}
        unitLabel={unitLabel}
      />

      {/* 3. Responsive Leaderboard Data Table */}
      <LeaderboardDataTable
        items={items}
        tableTitle={tableTitle}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    </div>
  );
};
