import React from 'react';
import type { User, Customer } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';
import { Truck } from 'lucide-react';

export interface InterestedFiltersProps {
  selectedMemberId: string;
  onMemberIdChange: (memberId: string) => void;
  teamMembers: User[];
  allCustomers: Customer[];
  search: string;
  onSearchChange: (query: string) => void;
  filteredCount: number;
  selectedCount: number;
  allFilteredSelected: boolean;
  onToggleSelectAll: () => void;
  selectAllCheckboxRef: React.RefObject<HTMLInputElement | null>;
  onBulkEditDelivery?: () => void;
}

export const InterestedFilters: React.FC<InterestedFiltersProps> = ({
  selectedMemberId,
  onMemberIdChange,
  teamMembers,
  allCustomers,
  search,
  onSearchChange,
  filteredCount,
  selectedCount,
  allFilteredSelected,
  onToggleSelectAll,
  selectAllCheckboxRef,
  onBulkEditDelivery,
}) => {
  return (
    <Card>
      <CardContent className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Team Member"
            value={selectedMemberId}
            onChange={(e) => onMemberIdChange(e.target.value)}
            options={[
              {
                value: 'ALL',
                label: `All Members (${allCustomers.length})`,
              },
              ...teamMembers.map((m) => {
                const mLeadCount = allCustomers.filter(
                  (c) => c.responsibleTeamMemberId === m.id
                ).length;

                return {
                  value: m.id,
                  label: `${m.fullName} (${mLeadCount})`,
                };
              }),
            ]}
          />

          <div className="flex flex-col justify-end min-w-0">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Select All & Summary Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
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

          <div className="flex items-center gap-2">
            {selectedCount > 0 && onBulkEditDelivery && (
              <button
                type="button"
                onClick={onBulkEditDelivery}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  selectedCount > 20
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
                }`}
                title={
                  selectedCount > 20
                    ? `Selected ${selectedCount} orders. Max 20 allowed for bulk edit.`
                    : 'Bulk edit delivery amount for selected orders'
                }
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  Bulk Edit Delivery ({selectedCount}
                  {selectedCount > 20 ? ' / 20 max' : ''})
                </span>
              </button>
            )}
            <div className="shrink-0 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {selectedCount} Selected
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
