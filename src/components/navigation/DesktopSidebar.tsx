import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_NAVIGATION, NavItem } from '../../config/navigation';
import { getTeamBranding } from '../../config/branding';
import { ChevronLeft, ChevronRight, ChevronDown, LogOut } from 'lucide-react';

export interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  // State to track open dropdowns by group/label
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Supervisor: true,
    Finance: true,
  });

  const navItems = (role && ROLE_NAVIGATION[role]) || [];
  const teamBrand = getTeamBranding(user?.team || user?.teamId);

  // Auto-expand group if current path is inside that group's children
  useEffect(() => {
    if (!navItems.length) return;
    navItems.forEach((item) => {
      if (item.children && item.children.some((c) => location.pathname.startsWith(c.path))) {
        setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
      }
    });
  }, [location.pathname, navItems]);

  if (!user || !role) return null;

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 relative shrink-0 z-20 ${
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
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
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
          style={{ backgroundColor: teamBrand.brandColor }}
        >
          {role === 'ADMIN' ? 'AD' : teamBrand.code.substring(0, 2)}
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h2 className="font-bold text-xs text-slate-900 truncate tracking-tight">
              {role === 'ADMIN' ? '500 Labs Admin' : teamBrand.name}
            </h2>
            <p className="text-[10px] text-blue-600 font-bold truncate uppercase tracking-wider">{role} Portal</p>
          </div>
        )}
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto">
        {navItems
          .filter((item) => item.path !== '#more')
          .map((item) => {
            const Icon = item.icon;

            // 1. Group / Dropdown Items (e.g. Supervisor, Finance)
            if (item.children && item.children.length > 0) {
              const isOpen = !!openGroups[item.label];
              const hasActiveChild = item.children.some((child) =>
                location.pathname.startsWith(child.path)
              );

              return (
                <div key={item.label} className="pt-2">
                  {!isCollapsed ? (
                    <div>
                      {/* Dropdown Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          hasActiveChild
                            ? 'text-blue-700 bg-blue-50/70'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isOpen ? 'rotate-0 text-blue-600' : '-rotate-90 text-slate-400'
                          }`}
                        />
                      </button>

                      {/* Expandable Child Links */}
                      {isOpen && (
                        <div className="mt-1 ml-3 pl-3 border-l border-slate-200 space-y-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) =>
                                  `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                                  }`
                                }
                              >
                                <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Collapsed Icon Group */
                    <div className="flex flex-col items-center gap-1 py-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `flex items-center justify-center w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                              }`
                            }
                            title={`${item.label} → ${child.label}`}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // 2. Direct Navigation Links (Home, Users, Reports, Activity, Profile)
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
