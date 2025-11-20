import './globals.css'
import './mobile.css'
import { ToastProvider } from '@/components/ui/Toast'
import { Toaster } from 'sonner'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { SentryInitializer } from '@/components/SentryInitializer'

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
      </head>
      <body>
        <SentryInitializer />
        <ToastProvider>
          <NotificationProvider>
            <Toaster position="top-right" />
            {children}
          </NotificationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
