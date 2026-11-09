import React, { useState, useEffect, useMemo } from 'react';
import { ActivityLog, User } from '../../models/domain';
import { activityLogRepository, userRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import {
  Activity,
  Calendar,
  User as UserIcon,
  Search,
  Filter,
  RotateCcw,
  Shield,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIERS, queryKeys } from '../../lib/queryClient';

export const AdminActivityPage: React.FC = () => {
  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionCategoryFilter, setActionCategoryFilter] = useState('ALL');

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Date Filter States
  const [datePreset, setDatePreset] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  >('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const serverDateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === 'TODAY') return { startDate: format(startOfDay(now), 'yyyy-MM-dd'), endDate: format(endOfDay(now), 'yyyy-MM-dd') };
    if (datePreset === 'YESTERDAY') {
      const yesterday = subDays(now, 1);
      return { startDate: format(startOfDay(yesterday), 'yyyy-MM-dd'), endDate: format(endOfDay(yesterday), 'yyyy-MM-dd') };
    }
    if (datePreset === '7DAYS') return { startDate: format(startOfDay(subDays(now, 7)), 'yyyy-MM-dd') };
    if (datePreset === 'THIS_MONTH') return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
    if (datePreset === 'LAST_MONTH') {
      const lastMonth = subMonths(now, 1);
      return { startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
    }
    if (datePreset === 'CUSTOM' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return {};
  }, [datePreset, customStartDate, customEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUserId, debouncedSearch, roleFilter, actionCategoryFilter, datePreset, customStartDate, customEndDate]);

  const { data: activityPage, isLoading: logsLoading } = useQuery({
    queryKey: [
      'activities',
      selectedUserId,
      debouncedSearch,
      roleFilter,
      actionCategoryFilter,
      datePreset,
      customStartDate,
      customEndDate,
      currentPage,
    ],
    queryFn: () => activityLogRepository.getPaginated({
      userId: selectedUserId !== 'ALL' ? selectedUserId : undefined,
      // "All Recorded Time" must not be narrowed to the backend's recent
      // (last-30-days) scope. Date presets are sent explicitly below.
      recent: false,
      search: debouncedSearch.trim() || undefined,
      userRole: roleFilter !== 'ALL' ? roleFilter : undefined,
      actionCategory: actionCategoryFilter !== 'ALL' ? actionCategoryFilter : undefined,
      ...serverDateRange,
      page: currentPage,
      limit: pageSize,
    }),
    staleTime: CACHE_TIERS.WARM,
  });

  const rawActivities = activityPage?.items ?? [];
  const pageInfo = activityPage?.pageInfo;

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: userRepository.getAll,
    staleTime: CACHE_TIERS.COLD,
  });

  const loading = logsLoading || usersLoading;

  const activities = useMemo(() => {
    return [...rawActivities].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawActivities]);

  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  // Selected User Object (if specific user selected)
  const selectedUserObj = selectedUserId !== 'ALL' ? usersMap[selectedUserId] : null;

  // The repository returns a filtered page from the server. Filtering again
  // here would make the rendered page disagree with pageInfo and could hide
  // records from an otherwise valid page (especially around date boundaries).
  const filteredActivities = activities;

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedUserId('ALL');
    setRoleFilter('ALL');
    setActionCategoryFilter('ALL');
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters =
    search ||
    selectedUserId !== 'ALL' ||
    roleFilter !== 'ALL' ||
    actionCategoryFilter !== 'ALL' ||
    datePreset !== 'ALL';

  // Stats calculation
  const todayCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return activities.filter((a) => new Date(a.createdAt) >= todayStart).length;
  }, [activities]);

  const uniqueOperatorsCount = useMemo(() => {
    const set = new Set(filteredActivities.map((a) => a.userId));
    return set.size;
  }, [filteredActivities]);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit & Activity Logs"
        description="Monitor comprehensive user-wise activity, date intervals, role actions, and platform state transitions"
      />

      {/* Filter Control Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#01A8F3]" />
              <span>Activity Filters &amp; User Monitoring</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[#0188C7] hover:text-[#0096DC] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <Input
                label="Search Keyword"
                placeholder="Search user name, action, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                onClear={() => setSearch('')}
              />
            </div>

            {/* User-Wise Selector */}
            <div>
              <Select
                label="Monitor Specific User"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Users (Everyone)' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: `${u.fullName} (${u.role}${u.teamId ? ` - ${u.teamId}` : ''})`,
                  })),
                ]}
              />
            </div>

            {/* Date Preset Filter */}
            <div>
              <Select
                label="Date Range Interval"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
                options={[
                  { value: 'ALL', label: 'All Recorded Time' },
                  { value: 'TODAY', label: 'Today Only' },
                  { value: 'YESTERDAY', label: 'Yesterday' },
                  { value: '7DAYS', label: 'Last 7 Days' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'CUSTOM', label: 'Custom Date Range...' },
                ]}
              />
            </div>
          </div>

          {/* Secondary Filter Row: Role & Action Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
            <div>
              <Select
                label="Filter by Role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  { value: 'ADMIN', label: 'Admin Actions' },
                  { value: 'SUPERVISOR', label: 'Supervisor Actions' },
                  { value: 'TEAM_MEMBER', label: 'Team Member / Sales' },
                  { value: 'FINANCE', label: 'Finance Actions' },
                ]}
              />
            </div>

            <div>
              <Select
                label="Action Category"
                value={actionCategoryFilter}
                onChange={(e) => setActionCategoryFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Activity Types' },
                  { value: 'CONTACTS', label: 'Leads & Allocation Actions' },
                  { value: 'CALLS', label: 'Tele-Calling & Customers' },
                  { value: 'ORDERS', label: 'Orders & Dispatches' },
                  { value: 'FINANCE', label: 'Finance & Expenses' },
                  { value: 'USERS', label: 'User Account Changes' },
                ]}
              />
            </div>

            {/* Custom Date Inputs if CUSTOM selected */}
            {datePreset === 'CUSTOM' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </>
            )}
          </div>

          {/* User-Wise Profile Banner (When specific user is monitored) */}
          {selectedUserObj && (
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <ProfileAvatar name={selectedUserObj.fullName} avatarUrl={selectedUserObj.avatarUrl} size="md" />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Monitoring User:</span>
                    <span className="text-[#0188C7] text-sm font-extrabold">{selectedUserObj.fullName}</span>
                    <span className="px-2 py-0.5 rounded bg-[#E8F7FE] text-[#0188C7] text-[10px] font-bold">
                      {selectedUserObj.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedUserObj.email} • {selectedUserObj.phone}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {pageInfo?.total ?? filteredActivities.length} Actions Recorded
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId('ALL')}
                  className="text-[11px] text-[#0188C7] hover:underline font-semibold mt-0.5 cursor-pointer"
                >
                  Clear User Filter
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline Results */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#01A8F3]" />
              <span>Activity Audit Trail</span>
            </div>
            <span className="text-xs font-bold text-[#0188C7] bg-[#E8F7FE] border border-[#B9E7FC] px-2.5 py-0.5 rounded-full font-mono">
              {pageInfo?.total ?? filteredActivities.length} Entries
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredActivities.length === 0 ? (
            <EmptyState
              title="No activity logs match your filter criteria"
              description="Try adjusting your date range, user filter, or search keyword."
            />
          ) : (
            <ActivityTimeline activities={filteredActivities} virtualize={false} />
          )}
          {pageInfo && pageInfo.totalPages && pageInfo.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
              <span>Page {pageInfo.page ?? currentPage} of {pageInfo.totalPages} ({pageInfo.total} total)</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pageInfo.hasPreviousPage}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
