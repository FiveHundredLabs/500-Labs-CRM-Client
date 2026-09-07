import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import { format } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { ROLE_NAVIGATION } from '../../config/navigation';
import { getTeamBranding } from '../../config/branding';
import { UserProfileMenu } from './UserProfileMenu';

export interface DesktopSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  isCollapsed,
  onToggle,
}) => {
  const { user, role } = useAuth();
  const location = useLocation();

  /**
   * Dropdown groups are collapsed by default.
   * Active group will automatically open based on current route.
   */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Supervisor: false,
    Finance: false,
  });

  /**
   * Navigation items for current role.
   */
  const navItems = useMemo(
    () => (role && ROLE_NAVIGATION[role]) || [],
    [role]
  );

  /**
   * Team branding.
   */
  const teamBrand = getTeamBranding(user?.team || user?.teamId);
  const isUnknownTeam = teamBrand.name === 'Unknown Team';

  /**
   * Portal label based on role.
   */
  const rolePortalLabel = role
    ? `${role
        .split('_')
        .map(
          (part) =>
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(' ')} Portal`
    : 'CRM Portal';

  /**
   * Finance routes should display Finance Portal.
   */
  const portalName =
    location.pathname.startsWith('/finance') ||
    location.pathname.startsWith('/admin/finance')
      ? 'Finance Portal'
      : rolePortalLabel;

  /**
   * Team name fallback.
   */
  const teamName =
    user?.team?.name ||
    (isUnknownTeam ? 'Level Grow' : teamBrand.name);

  /**
   * Automatically expand the navigation group
   * if the user is currently inside one of its child routes.
   */
  useEffect(() => {
    if (!navItems.length) return;

    navItems.forEach((item) => {
      if (
        item.children &&
        item.children.some((child) =>
          location.pathname.startsWith(child.path)
        )
      ) {
        setOpenGroups((prev) => ({
          ...prev,
          [item.label]: true,
        }));
      }
    });
  }, [location.pathname, navItems]);

  if (!user || !role) {
    return null;
  }

  /**
   * Open / close grouped navigation.
   */
  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  return (
    <aside
      className={`
        hidden md:flex
        relative z-20
        h-full shrink-0 flex-col
        border-r border-slate-200/80
        bg-white
        transition-[width] duration-200 ease-out
        ${isCollapsed ? 'w-[64px]' : 'w-[260px]'}
      `}
    >
      {/* =========================================================
          SIDEBAR COLLAPSE BUTTON
      ========================================================= */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="
          absolute -right-3 top-5 z-30
          flex h-6 w-6 items-center justify-center
          rounded-full
          border border-slate-200
          bg-white
          text-slate-500
          shadow-sm
          transition-all duration-150
          hover:scale-105
          hover:border-slate-300
          hover:text-slate-900
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500/20
        "
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* =========================================================
          COMPANY LOGO
      ========================================================= */}
      <div className="shrink-0 border-b border-slate-100 bg-white">
        <div
          className={`
            flex items-center
            ${
              isCollapsed
                ? 'justify-center px-2 py-4'
                : 'justify-start px-4 py-4'
            }
          `}
        >
          <img
            src="/logos/Level Grow Logo.png"
            alt="Level Grow"
            className={`
              block object-contain
              ${
                isCollapsed
                  ? 'h-8 w-8'
                  : 'h-auto max-h-[76px] w-full max-w-full'
              }
            `}
          />
        </div>
      </div>

      {/* =========================================================
          MAIN NAVIGATION
      ========================================================= */}
      <nav
        className="
          flex-1
          overflow-y-auto
          overflow-x-hidden
          px-2 py-3
          scrollbar-thin
        "
      >
        <div className="space-y-1">
          {navItems
            .filter((item) => item.path !== '#more')
            .map((item) => {
              const Icon = item.icon;

              /**
               * =====================================================
               * GROUP NAVIGATION
               * Supervisor / Finance / etc.
               * =====================================================
               */
              if (item.children && item.children.length > 0) {
                const isOpen = !!openGroups[item.label];

                const hasActiveChild = item.children.some((child) =>
                  location.pathname.startsWith(child.path)
                );

                /**
                 * Collapsed sidebar:
                 * show all child icons directly.
                 */
                if (isCollapsed) {
                  return (
                    <div
                      key={item.label}
                      className="border-t border-slate-100 pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-col items-center gap-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;

                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              title={`${item.label} → ${child.label}`}
                              className={({ isActive }) =>
                                `
                                  flex h-10 w-10
                                  items-center justify-center
                                  rounded-lg
                                  transition-all duration-150
                                  ${
                                    isActive
                                      ? `
                                        bg-gradient-to-r
                                        from-blue-600
                                        to-indigo-600
                                        text-white
                                        shadow-[0_5px_12px_rgba(37,99,235,0.25)]
                                      `
                                      : `
                                        text-slate-500
                                        hover:bg-slate-100
                                        hover:text-slate-900
                                      `
                                  }
                                `
                              }
                            >
                              <ChildIcon className="h-[18px] w-[18px] shrink-0" />
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                /**
                 * Expanded grouped navigation.
                 */
                return (
                  <div
                    key={item.label}
                    className="pt-2"
                  >
                    {/* Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={`
                        flex w-full
                        items-center justify-between
                        rounded-lg
                        px-3 py-2.5
                        text-left
                        transition-colors duration-150
                        ${
                          hasActiveChild
                            ? 'text-blue-700'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }
                      `}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`
                            h-[17px] w-[17px] shrink-0
                            ${
                              hasActiveChild
                                ? 'text-blue-600'
                                : 'text-slate-400'
                            }
                          `}
                        />

                        <span className="truncate text-[11px] font-bold uppercase tracking-[0.055em]">
                          {item.label}
                        </span>

                        {item.label.toLowerCase() === 'finance' && (
                          <span
                            className="
                              rounded
                              border border-amber-400
                              bg-amber-50
                              px-1.5 py-[1px]
                              text-[8px]
                              font-bold
                              leading-none
                              text-amber-700
                            "
                          >
                            DEV
                          </span>
                        )}
                      </div>

                      <ChevronDown
                        className={`
                          h-3.5 w-3.5 shrink-0
                          transition-transform duration-200
                          ${
                            isOpen
                              ? 'rotate-0'
                              : '-rotate-90'
                          }
                          ${
                            hasActiveChild
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }
                        `}
                      />
                    </button>

                    {/* Children */}
                    <div
                      className={`
                        grid overflow-hidden
                        transition-[grid-template-rows,opacity] duration-200 ease-out
                        ${
                          isOpen
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                        }
                      `}
                    >
                      <div className="min-h-0">
                        <div className="ml-[19px] mt-1 border-l border-slate-200 pl-2">
                          <div className="space-y-1">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;

                              return (
                                <NavLink
                                  key={child.path}
                                  to={child.path}
                                  className={({ isActive }) =>
                                    `
                                      group
                                      flex min-h-[38px]
                                      items-center gap-2.5
                                      rounded-lg
                                      px-3 py-2
                                      text-[13px]
                                      font-medium
                                      transition-all duration-150
                                      ${
                                        isActive
                                          ? `
                                            bg-gradient-to-r
                                            from-blue-600
                                            to-indigo-600
                                            text-white
                                            shadow-[0_5px_12px_rgba(37,99,235,0.22)]
                                          `
                                          : `
                                            text-slate-600
                                            hover:bg-slate-100
                                            hover:text-slate-900
                                          `
                                      }
                                    `
                                  }
                                >
                                  <ChildIcon className="h-4 w-4 shrink-0" />

                                  <span className="min-w-0 truncate">
                                    {child.label}
                                  </span>
                                </NavLink>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /**
               * =====================================================
               * STANDARD NAVIGATION
               * Home / Users / Products / Reports / etc.
               * =====================================================
               */
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `
                      group
                      flex min-h-[38px]
                      items-center
                      rounded-lg
                      py-2
                      text-[13px]
                      font-medium
                      transition-all duration-150
                      ${
                        isCollapsed
                          ? 'justify-center px-0'
                          : 'gap-3 px-3'
                      }
                      ${
                        isActive
                          ? `
                            bg-gradient-to-r
                            from-blue-600
                            to-indigo-600
                            font-semibold
                            text-white
                            shadow-[0_5px_14px_rgba(37,99,235,0.27)]
                          `
                          : `
                            text-slate-600
                            hover:bg-slate-100
                            hover:text-slate-900
                          `
                      }
                    `
                  }
                >
                  <Icon
                    className="
                      h-[18px] w-[18px]
                      shrink-0
                    "
                  />

                  {!isCollapsed && (
                    <span className="min-w-0 truncate">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </div>
      </nav>

      {/* =========================================================
          BOTTOM AREA
      ========================================================= */}
      <div className="shrink-0 border-t border-slate-100 bg-white">
        {/* Workspace / Team Information */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-2">
            <div
              className="
                rounded-xl
                border border-slate-200/80
                bg-slate-50/80
                px-3 py-2.5
              "
            >
              {/* Team */}
              <div className="flex min-w-0 items-start gap-2.5 py-1.5">
                <div
                  className="
                    mt-[1px]
                    flex h-7 w-7 shrink-0
                    items-center justify-center
                    rounded-lg
                    border border-slate-200
                    bg-white
                    text-slate-500
                  "
                >
                  <Building2 className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Team
                  </div>

                  <div
                    title={teamName}
                    className="
                      mt-0.5
                      truncate
                      text-[12px]
                      font-semibold
                      leading-tight
                      text-slate-800
                    "
                  >
                    {teamName}
                  </div>
                </div>
              </div>

              {/* Portal */}
              <div className="flex min-w-0 items-start gap-2.5 py-1.5">
                <div
                  className="
                    mt-[1px]
                    flex h-7 w-7 shrink-0
                    items-center justify-center
                    rounded-lg
                    border border-slate-200
                    bg-white
                    text-slate-500
                  "
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Portal
                  </div>

                  <div
                    title={portalName}
                    className="
                      mt-0.5
                      truncate
                      text-[12px]
                      font-semibold
                      leading-tight
                      text-slate-800
                    "
                  >
                    {portalName}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex min-w-0 items-start gap-2.5 py-1.5">
                <div
                  className="
                    mt-[1px]
                    flex h-7 w-7 shrink-0
                    items-center justify-center
                    rounded-lg
                    border border-slate-200
                    bg-white
                    text-slate-500
                  "
                >
                  <Calendar className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Date
                  </div>

                  <div className="mt-0.5 text-[12px] font-semibold leading-tight text-slate-800">
                    {format(new Date(), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div
          className={`
            border-t border-slate-100
            ${isCollapsed ? 'p-2' : 'px-3 py-3'}
          `}
        >
          <UserProfileMenu
            isCollapsed={isCollapsed}
            placement="top"
          />
        </div>
      </div>
    </aside>
  );
};