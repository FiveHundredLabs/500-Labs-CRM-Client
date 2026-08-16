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
  isWithinInterval,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

export const AdminActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionCategoryFilter, setActionCategoryFilter] = useState('ALL');

  // Date Filter States
  const [datePreset, setDatePreset] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  >('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const loadLogsAndUsers = async () => {
      setLoading(true);
      try {
        const [logs, userList] = await Promise.all([
          activityLogRepository.getAll(),
          userRepository.getAll(),
        ]);
        setActivities(
          logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        setUsers(userList);
      } finally {
        setLoading(false);
      }
    };
    loadLogsAndUsers();
  }, []);

  const usersMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  // Selected User Object (if specific user selected)
  const selectedUserObj = selectedUserId !== 'ALL' ? usersMap[selectedUserId] : null;

  // Filter Logic
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          act.userName.toLowerCase().includes(q) ||
          act.description.toLowerCase().includes(q) ||
          act.action.toLowerCase().includes(q) ||
          act.entityType.toLowerCase().includes(q) ||
          act.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. User-Wise Filter
      if (selectedUserId !== 'ALL' && act.userId !== selectedUserId) {
        return false;
      }

      // 3. Role Filter
      if (roleFilter !== 'ALL' && act.userRole !== roleFilter) {
        return false;
      }

      // 4. Action Category Filter
      if (actionCategoryFilter !== 'ALL') {
        if (actionCategoryFilter === 'CONTACTS' && !act.action.includes('CONTACT')) return false;
        if (actionCategoryFilter === 'CALLS' && !act.action.includes('CALL') && !act.action.includes('CUSTOMER'))
          return false;
        if (actionCategoryFilter === 'ORDERS' && !act.action.includes('ORDER') && !act.action.includes('DELIVERY'))
          return false;
        if (actionCategoryFilter === 'FINANCE' && !act.action.includes('EXPENSE')) return false;
        if (actionCategoryFilter === 'USERS' && !act.action.includes('USER')) return false;
      }

      // 5. Date Filter
      const logDate = new Date(act.createdAt);
      const now = new Date();

      if (datePreset === 'TODAY') {
        const start = startOfDay(now);
        const end = endOfDay(now);
        if (!isWithinInterval(logDate, { start, end })) return false;
      } else if (datePreset === 'YESTERDAY') {
        const yesterday = subDays(now, 1);
        const start = startOfDay(yesterday);
        const end = endOfDay(yesterday);
        if (!isWithinInterval(logDate, { start, end })) return false;
      } else if (datePreset === '7DAYS') {
        const start7 = startOfDay(subDays(now, 7));
        if (logDate < start7) return false;
      } else if (datePreset === 'THIS_MONTH') {
        const startM = startOfMonth(now);
        const endM = endOfMonth(now);
        if (!isWithinInterval(logDate, { start: startM, end: endM })) return false;
      } else if (datePreset === 'LAST_MONTH') {
        const lastM = subMonths(now, 1);
        const startLM = startOfMonth(lastM);
        const endLM = endOfMonth(lastM);
        if (!isWithinInterval(logDate, { start: startLM, end: endLM })) return false;
      } else if (datePreset === 'CUSTOM' && customStartDate && customEndDate) {
        const start = startOfDay(new Date(customStartDate));
        const end = endOfDay(new Date(customEndDate));
        if (!isWithinInterval(logDate, { start, end })) return false;
      }

      return true;
    });
  }, [
    activities,
    search,
    selectedUserId,
    roleFilter,
    actionCategoryFilter,
    datePreset,
    customStartDate,
    customEndDate,
  ]);

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
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="System Audit & Activity Logs"
        description="Monitor comprehensive user-wise activity, date intervals, role actions, and platform state transitions"
      />

      {/* Filter Control Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Activity Filters &amp; User Monitoring</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
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
                    label: `${u.fullName} (${u.role}${u.teamId ? (u.teamId === 'team_001' ? ' - Alpha' : ' - Beta') : ''})`,
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
                    <span className="text-blue-700 text-sm font-extrabold">{selectedUserObj.fullName}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {selectedUserObj.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedUserObj.email} • {selectedUserObj.phone} • {selectedUserObj.city || 'Colombo'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {filteredActivities.length} Actions Recorded
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId('ALL')}
                  className="text-[11px] text-blue-600 hover:underline font-semibold mt-0.5 cursor-pointer"
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
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Activity Audit Trail</span>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono">
              {filteredActivities.length} Entries
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
            <ActivityTimeline activities={filteredActivities} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
