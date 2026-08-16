import React from 'react';
import type { User, Customer } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';

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

          <div className="shrink-0 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            {selectedCount} Selected
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
