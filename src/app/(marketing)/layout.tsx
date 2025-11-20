import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SiteProc - Construction Management Platform',
  description: 'Complete construction project management solution',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
