import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_NAVIGATION } from '../../config/navigation';
import { Sheet } from '../ui/Sheet';
import { LogOut } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (!user || !role) return null;

  const allNavItems = ROLE_NAVIGATION[role] || [];
  const bottomNavItems = allNavItems.filter((i) => i.isBottomNav);
  const secondaryNavItems = allNavItems.filter((i) => !i.isBottomNav);

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
        title="More Features"
        description="Quick access to secondary operations"
        position="bottom"
      >
        <div className="grid grid-cols-2 gap-2.5 py-2">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMoreOpen(false)}
                className="flex flex-col items-center p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors text-center"
              >
                <div className="p-2 bg-white text-blue-600 rounded-lg border border-slate-200 shadow-2xs mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              setIsMoreOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-xs hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </Sheet>
    </>
  );
};
