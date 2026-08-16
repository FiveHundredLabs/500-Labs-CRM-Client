import React from 'react';
import { Select } from '../../ui/Select';
import { Calendar, Search } from 'lucide-react';

export interface TeamMemberFiltersProps {
  datePreset: string;
  onDatePresetChange: (preset: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const TeamMemberFilters: React.FC<TeamMemberFiltersProps> = ({
  datePreset,
  onDatePresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Search Team Member</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Date Preset */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Time Period</span>
          </label>
          <Select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Time' },
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'LAST_MONTH', label: 'Last Month' },
              { value: 'THIS_WEEK', label: 'This Week' },
              { value: 'CUSTOM', label: 'Custom Date Range' },
            ]}
          />
        </div>

        {/* Custom Start Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              onDatePresetChange('CUSTOM');
              onStartDateChange(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Custom End Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              onDatePresetChange('CUSTOM');
              onEndDateChange(e.target.value);
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>
    </div>
  );
};
