import './globals.css'
import './mobile.css'
import { ToastProvider } from '@/components/ui/Toast'
import { Toaster } from 'sonner'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { SentryInitializer } from '@/components/SentryInitializer'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { OfflineSyncManager } from '@/components/OfflineSyncManager'
import { CurrencyProvider } from '@/lib/CurrencyContext'

// Root layout provides html/body structure and providers for all routes
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <SentryInitializer />
        <ServiceWorkerRegistration />
        <ToastProvider>
          <NotificationProvider>
            <CurrencyProvider>
              <Toaster position="top-right" />
              {children}
              <OfflineSyncManager />
            </CurrencyProvider>
          </NotificationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
