"use client";

import { SidebarNav } from "./sidebar-nav";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { MobileBottomNav } from "./MobileBottomNav";
import { useWhiteLabel } from "@/lib/WhiteLabelContext";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  hideMobileNav?: boolean;
  hideMobileHeader?: boolean;
}

export function AppLayout({ children, title, description, actions, hideMobileNav, hideMobileHeader }: AppLayoutProps) {
  const { displayName, logoUrl } = useWhiteLabel();
  
  return (
    <div className="flex bg-gray-50 fixed inset-0 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block flex-shrink-0">
        <SidebarNav />
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {/* Top header - more compact on mobile */}
        <header className={cn(
          "flex-shrink-0 bg-white border-b border-gray-200",
          hideMobileHeader && "hidden md:block"
        )}>
          <div className="flex h-11 md:h-14 items-center gap-2 md:gap-4 px-3 md:px-6">
            {/* Logo/Brand for mobile - with white-label support */}
            <div className="md:hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName} className="h-7 w-auto max-w-[120px] object-contain" />
              ) : (
                <div className="font-bold text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {displayName}
                </div>
              )}
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
            <div className="flex items-center gap-2 ml-auto">
              <NotificationBell />
            </div>
          </div>

          {/* Page header - more compact on mobile */}
          {title && (
            <div className="px-3 md:px-6 py-2 md:py-3 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl font-semibold text-gray-900 truncate">{title}</h1>
                  {description && (
                    <p className="text-xs text-gray-500 truncate">{description}</p>
                  )}
                </div>
                {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50 max-w-full p-3 md:p-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {!hideMobileNav && <MobileBottomNav />}
      </div>
    </div>
  );
}