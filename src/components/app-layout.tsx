"use client";

import { SidebarNav } from "./sidebar-nav";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  hideMobileNav?: boolean; // New prop to hide mobile nav (e.g., when in chat)
  hideMobileHeader?: boolean; // New prop to hide mobile header
}

export function AppLayout({ children, title, description, actions, hideMobileNav, hideMobileHeader }: AppLayoutProps) {
  return (
    <div className="flex bg-gray-50 fixed inset-0 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block flex-shrink-0">
        <SidebarNav />
      </div>

      {/* Main content wrapper - flex column to stack header, content, and nav */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {/* Top header - flex-shrink-0 keeps it fixed size */}
        {/* Hide on mobile when hideMobileHeader is true */}
        <header className={cn(
          "flex-shrink-0 bg-white border-b border-gray-200 shadow-sm",
          hideMobileHeader && "hidden md:block"
        )}>
          <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-4 md:px-6">
            {/* Logo/Brand for mobile */}
            <div className="md:hidden font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SiteProc
            </div>

            {/* Search - Desktop only */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search everything..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              <NotificationBell />
            </div>
          </div>

          {/* Page header */}
          {title && (
            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="w-full sm:w-auto">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900">{title}</h1>
                  {description && (
                    <p className="mt-1 text-xs md:text-sm text-gray-600">{description}</p>
                  )}
                </div>
                {actions && <div className="flex gap-2 w-full sm:w-auto">{actions}</div>}
              </div>
            </div>
          )}
        </header>

        {/* Page content - flex-1 with min-h-0 allows it to shrink and scroll */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50 max-w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation - hide when hideMobileNav is true */}
        {!hideMobileNav && <MobileBottomNav />}
      </div>
    </div>
  );
}