import { ToastProvider } from '@/components/ui/Toast'
import { Toaster } from 'sonner'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { SentryInitializer } from '@/components/SentryInitializer'

// Minimal root layout with only providers - route groups handle their own navigation
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SentryInitializer />
      <ToastProvider>
        <NotificationProvider>
          <Toaster position="top-right" />
          {children}
        </NotificationProvider>
      </ToastProvider>
    </>
  );
}
