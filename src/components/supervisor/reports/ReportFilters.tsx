import React from 'react';
import { User, OrderStatus } from '../../../models/domain';
import { Select } from '../../ui/Select';
import { ORDER_STATUS_CONFIG } from '../../../config/status';
import { Calendar, Users, Filter, Search } from 'lucide-react';

export interface ReportFiltersProps {
  datePreset: string;
  onDatePresetChange: (preset: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  teamMemberId: string;
  onTeamMemberIdChange: (memberId: string) => void;
  orderStatus: string;
  onOrderStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  teamMembers: User[];
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  datePreset,
  onDatePresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  teamMemberId,
  onTeamMemberIdChange,
  orderStatus,
  onOrderStatusChange,
  searchQuery,
  onSearchQueryChange,
  teamMembers,
}) => {
  const memberOptions = [
    { value: 'ALL', label: 'All Team Members' },
    ...teamMembers.map((m) => ({ value: m.id, label: m.fullName })),
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Order Statuses' },
    { value: 'DISPATCHED', label: 'Dispatched' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'REJECTED', label: 'Rejected / Returned' },
    { value: 'PREPARED', label: 'Prepared' },
    { value: 'DRAFT', label: 'Draft' },
  ];

  return (
    <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Report Filter Parameters</span>
        </div>
        {(teamMemberId !== 'ALL' || orderStatus !== 'ALL' || datePreset !== 'ALL' || searchQuery !== '') && (
          <button
            onClick={() => {
              onDatePresetChange('ALL');
              onStartDateChange('');
              onEndDateChange('');
              onTeamMemberIdChange('ALL');
              onOrderStatusChange('ALL');
              onSearchQueryChange('');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Order # or Item..."
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
            <span>Date Preset</span>
          </label>
          <Select
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Time' },
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'LAST_MONTH', label: 'Last Month' },
              { value: 'THIS_WEEK', label: 'This Week' },
              { value: 'CUSTOM', label: 'Custom Range' },
            ]}
          />
        </div>

        {/* Team Member */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Team Member</span>
          </label>
          <Select value={teamMemberId} onChange={(e) => onTeamMemberIdChange(e.target.value)} options={memberOptions} />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Order Status</label>
          <Select value={orderStatus} onChange={(e) => onOrderStatusChange(e.target.value)} options={statusOptions} />
        </div>

        {/* Custom Start & End Date Inputs */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                onDatePresetChange('CUSTOM');
                onStartDateChange(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                onDatePresetChange('CUSTOM');
                onEndDateChange(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
