import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_NAVIGATION } from '../../config/navigation';
import { getTeamBranding } from '../../config/branding';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

export interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, role, logout } = useAuth();
  if (!user || !role) return null;

  const navItems = ROLE_NAVIGATION[role] || [];
  const teamBrand = getTeamBranding(user.teamId || undefined);

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 relative shrink-0 z-20 ${
        isCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 z-30 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-xs cursor-pointer"
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ backgroundColor: teamBrand.brandColor }}
        >
          {teamBrand.code.substring(0, 2)}
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h2 className="font-bold text-xs text-slate-900 truncate tracking-tight">{teamBrand.name}</h2>
            <p className="text-[10px] text-slate-400 font-medium truncate uppercase">{role} Portal</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.path !== '#more')
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
      </nav>

      {/* User / Sign Out Footer */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
