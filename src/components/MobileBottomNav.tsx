'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Receipt,
  Package,
  Bell,
} from 'lucide-react';

const mobileNavItems = [
  { name: 'Dashboard', href: '/(app)/dashboard', icon: LayoutDashboard, matchPath: '/dashboard' },
  { name: 'Projects', href: '/projects', icon: FolderOpen, matchPath: '/projects' },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, matchPath: '/orders' },
  { name: 'Expenses', href: '/expenses', icon: Receipt, matchPath: '/expenses' },
  { name: 'Deliveries', href: '/deliveries', icon: Package, matchPath: '/deliveries' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.matchPath || pathname.startsWith(item.matchPath + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 active:text-blue-600'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className={cn(
                'text-xs',
                isActive ? 'font-semibold' : 'font-medium'
              )}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-blue-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
