import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getTeamBranding } from '../../config/branding';
import { ProfileAvatar } from '../shared/ProfileAvatar';
import { Calendar } from 'lucide-react';
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

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Date indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{format(new Date(), 'MMM dd, yyyy')}</span>
        </div>

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
