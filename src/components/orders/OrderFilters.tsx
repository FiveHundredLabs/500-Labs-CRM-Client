import React from 'react';
import type { User, Order } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';
import { Button } from '../ui/Button';
import { CalendarDays, X, RotateCcw } from 'lucide-react';

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
  allFilteredSelected: boolean;
  onToggleSelectAll: () => void;
  selectAllCheckboxRef: React.RefObject<HTMLInputElement | null>;
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
  allFilteredSelected,
  onToggleSelectAll,
  selectAllCheckboxRef,
  onOpenBulkModal,
}) => {
  const hasActiveFilters =
    Boolean(selectedDate) || selectedMemberId !== 'ALL' || Boolean(search) || statusFilter !== 'ALL';

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
            options={[
              {
                value: 'ALL',
                label: `All Members (${dateFilteredOrders.length})`,
              },
              ...teamMembers.map((m) => {
                const mCount = dateFilteredOrders.filter(
                  (o) => o.teamMemberId === m.id
                ).length;
                return {
                  value: m.id,
                  label: `${m.fullName} (${mCount})`,
                };
              }),
            ]}
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

        {/* Select All & Actions Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold min-w-0">
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 shrink-0 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="truncate">
                Select All ({filteredCount})
              </span>
            </label>

            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onStatusFilterChange('ALL')}
                className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Clear Status Filter (Show All)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="shrink-0 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {selectedCount} Selected
            </div>

            {selectedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenBulkModal}
                className="bg-slate-800 hover:bg-slate-900 text-white border-none font-semibold text-[11px] h-7 cursor-pointer"
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
