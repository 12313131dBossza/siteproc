import type { Metadata, Viewport } from "next";
import "../globals.css";
import "../mobile.css";
import Link from 'next/link'
import { Suspense } from 'react'
import PWAInitializer from '@/components/PWAInitializer'
import { NotificationBell } from '@/components/NotificationBell'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import GlobalSearch from '@/components/GlobalSearch'

export const metadata: Metadata = {
  title: "SiteProc - Project Management",
  description: "Complete project management solution for orders, expenses, and deliveries",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SiteProc",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0066cc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Simple top bar - Desktop only */}
      <nav className="hidden md:flex w-full p-3 justify-between items-center border-b border-black/10 dark:border-white/10 bg-white">
        <Link href="/" className="font-semibold">SiteProc</Link>
        <Suspense>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <NotificationBell />
            <div id="offline-indicator" className="flex items-center gap-2">
              <span id="offline-badge" className="text-sm bg-yellow-200 text-yellow-900 px-2 py-1 rounded hidden">
                Sync pending
              </span>
              <span id="install-badge" className="text-sm bg-blue-200 text-blue-900 px-2 py-1 rounded cursor-pointer hidden">
                Install App
              </span>
            </div>
          </div>
        </Suspense>
      </nav>
      
      {/* Main content */}
      {children}
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* PWA Initializer */}
      <PWAInitializer />
    </>
  );
}
