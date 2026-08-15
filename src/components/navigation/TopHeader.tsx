import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getTeamBranding } from '../../config/branding';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { Bell, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';

export const TopHeader: React.FC = () => {
  const { user, role } = useAuth();
  if (!user) return null;

  const teamBrand = getTeamBranding(user.teamId || undefined);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left logo / brand info */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 md:hidden"
          style={{ backgroundColor: teamBrand.brandColor }}
        >
          {teamBrand.code.substring(0, 1)}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-slate-900 leading-none">{teamBrand.name}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Enterprise Sales & CRM</div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, customers, calls (⌘K)..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-12 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Date indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{format(new Date(), 'MMM dd, yyyy')}</span>
        </div>

        {/* Notifications */}
        <button
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* User profile info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</span>
            <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">{role}</span>
          </div>
          <ProfileAvatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" />
        </div>
      </div>
    </header>
  );
};
