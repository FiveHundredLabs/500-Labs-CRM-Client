import React from 'react';
import type { User, Order } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';
import { Button } from '../ui/Button';
import { CalendarDays, X, RotateCcw, CheckSquare } from 'lucide-react';

export interface OrderFiltersProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedMemberId: string;
  onMemberIdChange: (memberId: string) => void;
  teamMembers: User[];
  dateFilteredOrders: Order[];
  search: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL';
  onStatusFilterChange: (status: 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'ALL') => void;
  onResetFilters: () => void;
  // Selection
  filteredCount: number;
  selectedCount: number;
  onSelectUpTo20: () => void;
  onClearSelection?: () => void;
  isUpTo20Selected: boolean;
  onOpenBulkModal: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  selectedDate,
  onDateChange,
  selectedMemberId,
  onMemberIdChange,
  teamMembers,
  dateFilteredOrders,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  filteredCount,
  selectedCount,
  onSelectUpTo20,
  onClearSelection,
  isUpTo20Selected,
  onOpenBulkModal,
}) => {
  const hasActiveFilters =
    Boolean(selectedDate) || selectedMemberId !== 'ALL' || Boolean(search) || statusFilter !== 'ALL';

  const memberCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < dateFilteredOrders.length; i++) {
      const mid = dateFilteredOrders[i].teamMemberId;
      map[mid] = (map[mid] || 0) + 1;
    }
    return map;
  }, [dateFilteredOrders]);

  const memberOptions = React.useMemo(() => [
    {
      value: 'ALL',
      label: `All Members (${dateFilteredOrders.length})`,
    },
    ...teamMembers.map((m) => ({
      value: m.id,
      label: `${m.fullName} (${memberCountMap[m.id] || 0})`,
    })),
  ], [dateFilteredOrders.length, teamMembers, memberCountMap]);

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Date Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Dispatched Date
              </label>
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-slate-900 font-medium cursor-pointer"
              />
            </div>
          </div>

          {/* Team Member Filter */}
          <Select
            label="Team Member"
            value={selectedMemberId}
            onChange={(e) => onMemberIdChange(e.target.value)}
            options={memberOptions}
          />

          {/* Search Input */}
          <div className="flex flex-col justify-end min-w-0">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Search mobile, name, order #, address..."
            />
          </div>
        </div>

        {/* Active Filter Pills & Clear Filters */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {selectedDate ? (
              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                <CalendarDays className="w-3 h-3" />
                Date: {selectedDate}
                <button
                  type="button"
                  onClick={() => onDateChange('')}
                  className="hover:text-blue-900 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Date Scope: All Dates</span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Select Up to 30 & Actions Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            {/* Control: Select up to 20 (Primary / Highlighted) */}
            <button
              type="button"
              onClick={onSelectUpTo20}
              disabled={filteredCount === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isUpTo20Selected
                  ? 'bg-[#01A8F3] text-white ring-2 ring-[#01A8F3]/30 shadow-sky-500/20'
                  : 'bg-sky-50 hover:bg-sky-100 text-[#0077b6] border border-sky-200 hover:border-sky-300'
              }`}
              title="Select up to 20 orders for normal bulk actions (Print, PDF, Bulk Status)"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{isUpTo20Selected ? 'Deselect (20)' : 'Select up to 20'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isUpTo20Selected
                    ? 'bg-white/20 text-white'
                    : 'bg-sky-200/70 text-[#0077b6]'
                }`}
              >
                Max 20
              </span>
            </button>

            {/* Clear Selection */}
            {selectedCount > 0 && onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors ml-1 cursor-pointer"
                title="Clear current selection"
              >
                Clear
              </button>
            )}

            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onStatusFilterChange('ALL')}
                className="text-[11px] text-blue-600 hover:underline font-medium ml-1 cursor-pointer"
              >
                Clear Status Filter (Show All)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div
              className={`shrink-0 font-semibold px-2 py-0.5 rounded border text-xs ${
                selectedCount > 20
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : selectedCount > 0
                  ? 'text-blue-700 bg-blue-50 border-blue-100'
                  : 'text-slate-500 bg-slate-50 border-slate-200'
              }`}
            >
              {selectedCount} Selected
              {selectedCount > 20 ? ' (Max 20 exceeded)' : ''}
            </div>

            {selectedCount > 0 && statusFilter !== 'DELIVERED' && statusFilter !== 'REJECTED' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenBulkModal}
                className={`bg-slate-800 hover:bg-slate-900 text-white border-none font-semibold text-[11px] h-7 cursor-pointer ${
                  selectedCount > 20 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={selectedCount > 20 ? 'Maximum 20 orders allowed for this action' : 'Bulk Status Change'}
              >
                Bulk Status Change
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
