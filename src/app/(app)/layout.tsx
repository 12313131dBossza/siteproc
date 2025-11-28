import type { Metadata, Viewport } from "next";
import "../globals.css";
import "../mobile.css";
import Link from 'next/link'
import { Suspense } from 'react'
import PWAInitializer from '@/components/PWAInitializer'
import { NotificationBell } from '@/components/NotificationBell'
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

export default function AppLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Main content - MobileBottomNav is now included in AppLayout component */}
      {children}
      
      {/* PWA Initializer */}
      <PWAInitializer />
    </>
  );
}
