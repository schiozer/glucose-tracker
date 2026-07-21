'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userPicture?: string;
}

export function AppLayout({ children, userName, userPicture }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <Sidebar className="hidden md:flex md:w-64" />

      {/* Sidebar - Mobile (Drawer) */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 md:hidden',
              'transform transition-transform duration-300 ease-in-out'
            )}
          >
            <Sidebar className="w-full" />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          userPicture={userPicture}
          onMenuToggle={toggleSidebar}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
