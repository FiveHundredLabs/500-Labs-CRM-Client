import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { getTeamBranding } from '../../config/branding';
import { UserProfileMenu } from './UserProfileMenu';

export const TopHeader: React.FC = () => {
  const { user, role } = useAuth();

  if (!user) return null;

  const teamBrand = getTeamBranding(user.team || user.teamId);
  const teamName = user.team?.name || (teamBrand.name === 'Unknown Team' ? 'Level Grow' : teamBrand.name);
  const portalName = role
    ? `${role
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ')} Portal`
    : 'CRM Portal';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md md:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          title="Go to Home"
          aria-label="Level Grow Home"
          className="flex shrink-0 items-center py-0.5 transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded cursor-pointer"
        >
          <img
            src="/logos/Level Grow Logo.png"
            alt="Level Grow"
            className="block h-[38px] w-auto max-w-[100px] shrink-0 object-contain"
          />
        </Link>
        <div className="hidden min-w-0 min-[390px]:block">
          <div className="truncate text-xs font-semibold leading-tight text-slate-900">{teamName}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span className="truncate">{portalName}</span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="shrink-0">{format(new Date(), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      <div className="flex w-auto shrink-0 items-center">
        <UserProfileMenu isCollapsed placement="bottom" />
      </div>
    </header>
  );
};
