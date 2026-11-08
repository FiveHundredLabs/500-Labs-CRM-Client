export interface LeaderboardItem {
  id: string;
  rank: number;
  name: string;
  avatarUrl?: string | null;
  isCurrentUser?: boolean;
  primaryValue: number; // Total Delivered Sales Amount (LKR)
  secondaryValue: number; // Delivered Orders count or Total Handled Orders
  primaryLabel?: string;
  secondaryLabel?: string;
  unitLabel?: string;
  formattedPrimary?: string;
  formattedSecondary?: string;
}

export interface LeaderboardProps {
  items: LeaderboardItem[];
  loading?: boolean;
  compact?: boolean;
  limit?: number;
  title?: string;
  chartTitle?: string;
  tableTitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  unitLabel?: string;
  isCurrency?: boolean;
  onViewFullLeaderboard?: () => void;
  emptyMessage?: string;
}

export const ROW_GRADIENTS = [
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
