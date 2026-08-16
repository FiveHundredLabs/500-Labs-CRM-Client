import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_NAVIGATION, NavItem } from '../../config/navigation';
import { Sheet } from '../ui/Sheet';
import { LogOut } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (!user || !role) return null;

  const allNavItems = ROLE_NAVIGATION[role] || [];
  const bottomNavItems = allNavItems.filter((i) => i.isBottomNav);

  // Group secondary items for the More sheet
  const supervisorChildren = allNavItems.find((i) => i.label === 'Supervisor')?.children || [];
  const financeChildren = allNavItems.find((i) => i.label === 'Finance')?.children || [];
  const directSecondary = allNavItems.filter((i) => !i.isBottomNav && !i.children);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 shadow-sm flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isMore = item.path === '#more';

          if (isMore) {
            return (
              <button
                key="more-btn"
                onClick={() => setIsMoreOpen(true)}
                className="flex flex-col items-center justify-center py-1 px-3 min-w-[60px] text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-[10px] font-medium mt-1">More</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 min-w-[60px] transition-colors ${
                  isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] font-medium mt-1 truncate max-w-[64px] text-center">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* More Options Sheet */}
      <Sheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="Operations & Features"
        description="Quick access to system operations"
        position="bottom"
      >
        <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto">
          {/* Direct Secondary Items */}
          {directSecondary.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {directSecondary.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreOpen(false)}
                    className="flex flex-col items-center p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors text-center"
                  >
                    <div className="p-2 bg-white text-blue-600 rounded-lg border border-slate-200 shadow-2xs mb-1.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* Supervisor Operations */}
          {supervisorChildren.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                Supervisor Operations
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {supervisorChildren.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex flex-col items-center p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors text-center"
                    >
                      <div className="p-2 bg-white text-blue-600 rounded-lg border border-slate-200 shadow-2xs mb-1.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finance Operations */}
          {financeChildren.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                Finance & Expenses
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {financeChildren.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex flex-col items-center p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-xl transition-colors text-center"
                    >
                      <div className="p-2 bg-white text-emerald-600 rounded-lg border border-slate-200 shadow-2xs mb-1.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              setIsMoreOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-xs hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </Sheet>
    </>
  );
};
