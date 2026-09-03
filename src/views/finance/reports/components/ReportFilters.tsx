import React from 'react';
import { ActiveFilters, SupportedFilterType } from '../types';
import { TEAMS, TeamItem, EXPENSE_CATEGORIES } from '../mockData';
import { Select } from '../../../../components/ui/Select';
import { 
  Calendar, 
  Filter, 
  Users, 
  Tag, 
  CreditCard, 
  X, 
  Clock 
} from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  startOfYear, 
  endOfYear,
  startOfQuarter,
  endOfQuarter 
} from 'date-fns';

interface ReportFiltersProps {
  supportedFilters: SupportedFilterType[];
  filters: ActiveFilters;
  onChange: (updated: ActiveFilters) => void;
  rightActions?: React.ReactNode;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  supportedFilters,
  filters,
  onChange,
  rightActions,
}) => {
  const supportsTeam = supportedFilters.includes('team');
  const supportsCategory = supportedFilters.includes('category');
  const supportsPaymentMethod = supportedFilters.includes('paymentMethod');

  // Handle Preset change
  const handlePresetChange = (preset: ActiveFilters['dateRange']['preset']) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'TODAY':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'THIS_WEEK':
        startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'THIS_MONTH':
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'LAST_MONTH': {
        const lastMonth = subMonths(now, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      }
      case 'THIS_QUARTER':
        startDate = format(startOfQuarter(now), 'yyyy-MM-dd');
        endDate = format(endOfQuarter(now), 'yyyy-MM-dd');
        break;
      case 'THIS_YEAR':
        startDate = format(startOfYear(now), 'yyyy-MM-dd');
        endDate = format(endOfYear(now), 'yyyy-MM-dd');
        break;
      case 'ALL':
      default:
        startDate = '';
        endDate = '';
        break;
    }

    onChange({
      ...filters,
      dateRange: {
        preset,
        startDate,
        endDate,
      },
    });
  };

  const handleCustomDateChange = (start: string, end: string) => {
    onChange({
      ...filters,
      dateRange: {
        preset: 'CUSTOM',
        startDate: start,
        endDate: end,
      },
    });
  };

  const handleResetFilters = () => {
    onChange({
      dateRange: {
        preset: 'ALL',
        startDate: '',
        endDate: '',
      },
      teamId: 'ALL',
      category: 'ALL',
      paymentMethod: 'ALL',
      search: '',
    });
  };

  const hasActiveFilters =
    filters.dateRange.preset !== 'ALL' ||
    (filters.category && filters.category !== 'ALL') ||
    (filters.paymentMethod && filters.paymentMethod !== 'ALL') ||
    (filters.teamId && filters.teamId !== 'ALL');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Compact Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Range:</span>
            </span>
            <div className="w-44">
              <Select
                value={filters.dateRange.preset}
                onChange={(e) => handlePresetChange(e.target.value as any)}
                options={[
                  { value: 'ALL', label: 'All Historic Dates' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'THIS_QUARTER', label: 'This Quarter' },
                  { value: 'THIS_YEAR', label: 'This Year (2026)' },
                  { value: 'CUSTOM', label: 'Custom Range...' },
                ]}
              />
            </div>
          </div>

          {/* Conditional Category Filter */}
          {supportsCategory && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Category:</span>
              </span>
              <div className="w-40">
                <Select
                  value={filters.category || 'ALL'}
                  onChange={(e) => onChange({ ...filters, category: e.target.value })}
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
            </div>
          )}

          {/* Conditional Payment Method Filter */}
          {supportsPaymentMethod && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Channel:</span>
              </span>
              <div className="w-36">
                <Select
                  value={filters.paymentMethod || 'ALL'}
                  onChange={(e) => onChange({ ...filters, paymentMethod: e.target.value })}
                  options={[
                    { value: 'ALL', label: 'All Channels' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                    { value: 'CASH', label: 'Cash / COD' },
                    { value: 'PETTY_CASH', label: 'Petty Cash' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Conditional Team Filter */}
          {supportsTeam && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Team:</span>
              </span>
              <div className="w-44">
                <Select
                  value={filters.teamId || 'ALL'}
                  onChange={(e) => onChange({ ...filters, teamId: e.target.value })}
                  options={[
                    { value: 'ALL', label: 'All Departments' },
                    ...TEAMS.map((t: TeamItem) => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
            </div>
          )}

          {/* Reset Filters (compact text button) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 h-8 px-2 text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              title="Reset Filters to Default"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Export Actions */}
        {rightActions && (
          <div className="shrink-0">
            {rightActions}
          </div>
        )}
      </div>

      {/* Custom Date Pickers (Compact sub-bar if custom range is selected) */}
      {(filters.dateRange.preset === 'CUSTOM' || (filters.dateRange.preset === 'ALL' && (filters.dateRange.startDate || filters.dateRange.endDate))) && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Range:</span>
          </span>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">From:</label>
            <input
              type="date"
              value={filters.dateRange.startDate}
              onChange={(e) => handleCustomDateChange(e.target.value, filters.dateRange.endDate)}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">To:</label>
            <input
              type="date"
              value={filters.dateRange.endDate}
              onChange={(e) => handleCustomDateChange(filters.dateRange.startDate, e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
