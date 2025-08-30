import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/deliveries', label: 'Deliveries' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/change-orders', label: 'Change Orders' },
  { href: '/users', label: 'Users & Roles' },
  { href: '/activity', label: 'Activity Log' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/bids', label: 'Bids' },
  { href: '/admin/contractors', label: 'Contractors' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[var(--sp-color-bg-alt)] border-r border-[var(--sp-color-border)] min-h-screen">
      <div className="h-14 flex items-center px-5 text-lg font-semibold tracking-tight border-b border-[var(--sp-color-border)]">SiteProc</div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${active ? 'bg-[var(--sp-color-primary)] text-white shadow-sm' : 'text-[var(--sp-color-muted)] hover:bg-[var(--sp-color-primary)]/10 hover:text-[var(--sp-color-primary)]'}`}>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-[var(--sp-color-border)] text-xs text-[var(--sp-color-muted)]">© {new Date().getFullYear()} SiteProc</div>
    </aside>
  );
}

export default Sidebar;
