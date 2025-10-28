import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link'
import { Suspense } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { Toaster } from 'sonner'
import PWAInitializer from '@/components/PWAInitializer'
import { Footer } from '@/components/Footer'
import { SentryInitializer } from '@/components/SentryInitializer'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MobileBottomNav } from '@/components/MobileBottomNav'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags */}
        <meta name="application-name" content="SiteProc" />
        <meta name="apple-mobile-web-app-title" content="SiteProc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0066cc" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        
        {/* Favicon - using SVG for all sizes */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SentryInitializer />
        <ToastProvider>
          <NotificationProvider>
            <Toaster position="top-right" />
            
            {/* Simple top bar - Desktop only */}
            <nav className="hidden md:flex w-full p-3 justify-between items-center border-b border-black/10 dark:border-white/10 bg-white">
              <Link href="/" className="font-semibold">SiteProc</Link>
              <Suspense>
                <div className="flex items-center gap-4">
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
            
            {/* Footer - hidden on mobile */}
            <div className="hidden md:block">
              <Footer />
            </div>
            
            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
            
            {/* PWA Initializer */}
            <PWAInitializer />
          </NotificationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
