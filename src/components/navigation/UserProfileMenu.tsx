import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileAvatar } from '../shared/ProfileAvatar';

interface UserProfileMenuProps {
  isCollapsed?: boolean;
  placement?: 'top' | 'bottom';
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  isCollapsed = false,
  placement = 'bottom',
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const roleLabel = role ? role.replace(/_/g, ' ') : '';
  const dropdownPosition =
    placement === 'top'
      ? 'bottom-full mb-2 left-0'
      : 'top-full mt-2 right-0';

  const getProfilePath = () => {
    switch (role) {
      case 'SUPERVISOR':
        return '/supervisor/profile';
      case 'ADMIN':
        return '/admin/profile';
      case 'FINANCE':
        return '/finance/profile';
      case 'TEAM_MEMBER':
      default:
        return '/member/profile';
    }
  };

  const handleNavigateProfile = () => {
    setIsDropdownOpen(false);
    navigate(getProfilePath());
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen((current) => !current)}
        className={`w-full rounded-lg hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          isCollapsed
            ? 'flex items-center justify-center p-1'
            : 'flex items-center gap-2.5 p-2 text-left'
        }`}
        aria-label="User Profile Menu"
        aria-expanded={isDropdownOpen}
        title={isCollapsed ? user.fullName : undefined}
      >
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold leading-tight text-slate-900">{user.fullName}</div>
            <div className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {roleLabel}
            </div>
          </div>
        )}

        <ProfileAvatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" />

        {!isCollapsed && (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {isDropdownOpen && (
        <div
          className={`absolute ${dropdownPosition} z-50 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150`}
        >
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-xs font-bold text-slate-900">{user.fullName}</p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              {roleLabel}
            </span>
          </div>

          <div className="py-1">
            <button
              onClick={handleNavigateProfile}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <UserIcon className="h-4 w-4 text-slate-400" />
              <span>My Profile</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
