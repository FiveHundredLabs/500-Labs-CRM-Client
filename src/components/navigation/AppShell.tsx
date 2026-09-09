import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TopHeader } from './TopHeader';

export const AppShell: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen theme-modern-mesh flex flex-col font-sans antialiased text-slate-800 overflow-hidden">
      <div className="flex flex-1 h-full min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <DesktopSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto pb-20 md:pb-6">
          <TopHeader />
          <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 w-full max-w-[1600px] mx-auto min-w-0 flex flex-col justify-between">
            <div className="flex-1">
              <Outlet />
            </div>

            {/* System Copyright & Developer Attribution */}
            <footer className="mt-6 sm:mt-8 pt-3 sm:pt-4 pb-1 sm:pb-2 border-t border-slate-200/60 flex items-center justify-center sm:justify-end">
              <div className="text-[9px] sm:text-[11px] text-slate-400 font-medium text-center sm:text-right leading-tight sm:leading-relaxed">
                <span>© 2026 500 Labs. All Rights Reserved.</span>{' '}
                <span className="text-slate-500 font-semibold">Developed &amp; Maintained by 500 Labs.</span>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
