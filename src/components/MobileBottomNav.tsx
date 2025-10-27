'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import { MobileMoreMenu } from './MobileMoreMenu';

const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200',
                  'active:scale-95',
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-b-full" />
                )}
                
                {/* Icon */}
                <div className={cn(
                  'transition-all duration-200',
                  isActive && 'scale-110'
                )}>
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                {/* Label */}
                <span className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200',
              'active:scale-95',
              'text-gray-500'
            )}
          >
            {/* Icon */}
            <div className="transition-all duration-200">
              <MoreHorizontal className="h-6 w-6" strokeWidth={2} />
            </div>
            
            {/* Label */}
            <span className="text-[10px] leading-tight font-medium">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Menu Modal */}
      <MobileMoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} />
    </>
  );
}
