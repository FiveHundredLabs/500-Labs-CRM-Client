import React from 'react';
import type { User, Customer } from '../../models/domain';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { SearchInput } from '../shared/SearchInput';
import { Truck, CheckSquare, FileSpreadsheet } from 'lucide-react';

export interface InterestedFiltersProps {
  selectedMemberId: string;
  onMemberIdChange: (memberId: string) => void;
  teamMembers: User[];
  allCustomers: Customer[];
  search: string;
  onSearchChange: (query: string) => void;
  filteredCount: number;
  selectedCount: number;
  onSelectUpTo30: () => void;
  onSelectAllExcel: () => void;
  onClearSelection?: () => void;
  isUpTo30Selected: boolean;
  isAllExcelSelected: boolean;
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
  onSelectUpTo30,
  onSelectAllExcel,
  onClearSelection,
  isUpTo30Selected,
  isAllExcelSelected,
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

        {/* Selection Controls & Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
          {/* Left: Two Clearly Separated Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Control 1: Select up to 30 (Primary / Highlighted) */}
            <button
              type="button"
              onClick={onSelectUpTo30}
              disabled={filteredCount === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isUpTo30Selected
                  ? 'bg-[#01A8F3] text-white ring-2 ring-[#01A8F3]/30 shadow-sky-500/20'
                  : 'bg-sky-50 hover:bg-sky-100 text-[#0077b6] border border-sky-200 hover:border-sky-300'
              }`}
              title="Select up to 30 orders for normal bulk actions (Print, PDF, Cancel, Delivery Charge)"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{isUpTo30Selected ? 'Deselect (30)' : 'Select up to 30'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isUpTo30Selected
                    ? 'bg-white/20 text-white'
                    : 'bg-sky-200/70 text-[#0077b6]'
                }`}
              >
                Max 30
              </span>
            </button>

            {/* Visual Separator */}
            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0 mx-0.5" />

            {/* Control 2: Select All for Excel (Visually Secondary) */}
            <button
              type="button"
              onClick={onSelectAllExcel}
              disabled={filteredCount === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isAllExcelSelected
                  ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/30'
                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300'
              }`}
              title="Select all filtered orders specifically for Excel export (No limit)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {isAllExcelSelected
                  ? `Deselect All Excel (${filteredCount})`
                  : `Select All for Excel (${filteredCount})`}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  isAllExcelSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Unlimited
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

          {/* Right: Actions & Selected Count Badge */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedCount > 0 && onBulkEditDelivery && (
              <button
                type="button"
                onClick={onBulkEditDelivery}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  selectedCount > 30
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
                }`}
                title={
                  selectedCount > 30
                    ? `Selected ${selectedCount} orders. Max 30 allowed for bulk edit.`
                    : 'Bulk edit delivery amount for selected orders (Max 30)'
                }
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  Bulk Edit Delivery ({selectedCount}
                  {selectedCount > 30 ? ' / 30 max' : ''})
                </span>
              </button>
            )}
            <div
              className={`shrink-0 font-semibold px-2 py-0.5 rounded border text-xs ${
                selectedCount > 30
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : selectedCount > 0
                  ? 'text-blue-700 bg-blue-50 border-blue-100'
                  : 'text-slate-500 bg-slate-50 border-slate-200'
              }`}
            >
              {selectedCount} Selected
              {selectedCount > 30 ? ' (Excel only)' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
