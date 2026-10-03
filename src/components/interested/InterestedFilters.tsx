import React from 'react';
import type { User, Customer } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';
import { CheckSquare, Square, FileSpreadsheet } from 'lucide-react';

export interface InterestedFiltersProps {
  selectedMemberId: string;
  onMemberIdChange: (memberId: string) => void;
  teamMembers: User[];
  allCustomers: Customer[];
  search: string;
  onSearchChange: (query: string) => void;
  filteredCount: number;
  selectedCount: number;
  onSelectUpTo20: () => void;
  onSelectAllExcel: () => void;
  onClearSelection?: () => void;
  isUpTo20Selected: boolean;
  isAllExcelSelected: boolean;
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
  onSelectUpTo20,
  onSelectAllExcel,
  onClearSelection,
  isUpTo20Selected,
  isAllExcelSelected,
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

        {/* Selection Controls & Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
          {/* Left: Two Clearly Separated Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Control 1: Select 20 (For Delivery Charge, Cancel) */}
            <button
              type="button"
              onClick={onSelectUpTo20}
              disabled={filteredCount === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isUpTo20Selected
                  ? 'bg-[#01A8F3] text-white ring-2 ring-[#01A8F3]/30 shadow-sky-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400'
              }`}
              title="Select 20 orders (Required for Delivery Charge and Cancel)"
            >
              {isUpTo20Selected ? (
                <CheckSquare className="w-3.5 h-3.5 text-white shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>{isUpTo20Selected ? 'Deselect (20)' : 'Select 20'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isUpTo20Selected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Max 20
              </span>
            </button>

            {/* Visual Separator */}
            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0 mx-0.5" />

            {/* Control 2: Select All (For Excel, PDF, Print - Unlimited) */}
            <button
              type="button"
              onClick={onSelectAllExcel}
              disabled={filteredCount === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isAllExcelSelected
                  ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/30'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400'
              }`}
              title="Select all filtered orders for Excel, PDF, and Print (No limit)"
            >
              {isAllExcelSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-white shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>
                {isAllExcelSelected
                  ? `Deselect All (${filteredCount})`
                  : `Select All (${filteredCount})`}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  isAllExcelSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Excel, PDF, Print
              </span>
            </button>

            {/* Clear Selection Link */}
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
          </div>

          {/* Right: Selected Count Badge */}
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
              {selectedCount > 20 ? ' (Excel, PDF, Print)' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
