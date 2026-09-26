import { QueryClient } from '@tanstack/react-query';

export const CACHE_TIERS = {
  /** Rapid operational data: 15 seconds */
  HOT: 15 * 1000,
  /** Normal CRM entities: 1 minute */
  WARM: 60 * 1000,
  /** Reference & static catalog data: 5 minutes */
  COLD: 5 * 60 * 1000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIERS.WARM,
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: any) => {
        // Don't retry 401, 403, 404
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Standard deterministic query key factories
 */
export const queryKeys = {
  orders: {
    all: ['orders'] as const,
    list: (filters?: Record<string, any>) => ['orders', 'list', filters ?? {}] as const,
    paginated: (filters?: Record<string, any>) => ['orders', 'paginated', filters ?? {}] as const,
    metrics: (filters?: Record<string, any>) => ['orders', 'metrics', filters ?? {}] as const,
    conflicts: (filters?: Record<string, any>) => ['orders', 'conflicts', filters ?? {}] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    history: (orderId: string) => ['orders', 'history', orderId] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters?: Record<string, any>) => ['customers', 'list', filters ?? {}] as const,
    paginated: (filters?: Record<string, any>) => ['customers', 'paginated', filters ?? {}] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    list: (filters?: Record<string, any>) => ['contacts', 'list', filters ?? {}] as const,
    counts: (filters?: Record<string, any>) => ['contacts', 'counts', filters ?? {}] as const,
    paginated: (filters?: Record<string, any>) => ['contacts', 'paginated', filters ?? {}] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
  },
  callLogs: {
    all: ['call-logs'] as const,
    list: (filters?: Record<string, any>) => ['call-logs', 'list', filters ?? {}] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: Record<string, any>) => ['expenses', 'list', filters ?? {}] as const,
    summary: (filters?: Record<string, any>) => ['expenses', 'summary', filters ?? {}] as const,
    paginated: (filters?: Record<string, any>) => ['expenses', 'paginated', filters ?? {}] as const,
    categories: ['expenses', 'categories'] as const,
  },
  users: {
    all: ['users'] as const,
    teamMembers: (teamId?: string) => ['users', 'team-members', teamId ?? ''] as const,
    leaderboard: (teamId?: string) => ['users', 'leaderboard', teamId ?? ''] as const,
  },
  dashboard: {
    admin: (filters?: Record<string, any>) => ['dashboard', 'admin', filters ?? {}] as const,
    supervisor: (filters?: Record<string, any>) => ['dashboard', 'supervisor', filters ?? {}] as const,
  },
  finance: {
    dashboard: (range?: any) => ['finance', 'dashboard', range ?? {}] as const,
    overview: (range?: any) => ['finance', 'overview', range ?? {}] as const,
    reports: (type: string, range?: any) => ['finance', 'reports', type, range ?? {}] as const,
    salesAnalysis: (filters?: Record<string, any>) => ['finance', 'sales-analysis', filters ?? {}] as const,
  },
};
