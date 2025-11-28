'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@supabase/ssr';
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Receipt,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { MobileMoreMenu } from './MobileMoreMenu';

// Mobile nav items with access levels
// 'all' = all users
// 'internal' = internal company members only
// 'viewer' = external viewers can see (project-scoped)
const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, access: 'internal' },
  { name: 'Projects', href: '/projects', icon: FolderOpen, access: 'all' },
  { name: 'Messages', href: '/messages', icon: MessageCircle, access: 'all' },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, access: 'viewer' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          setUserRole(profile?.role || 'viewer');
        }
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };
    
    loadUserRole();
  }, []);

  // Filter navigation based on user role
  const isInternalMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
  const isViewer = userRole === 'viewer';
  
  const filteredNavItems = mobileNavItems.filter(item => {
    if (item.access === 'all') return true;
    if (item.access === 'internal' && isInternalMember) return true;
    // Viewers can see 'viewer' items, internal members can too
    if (item.access === 'viewer' && (isViewer || isInternalMember)) return true;
    return false;
  });

  // Only show More button for internal members
  const showMoreButton = isInternalMember;

  return (
    <>
      <nav className="md:hidden flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16">
          {filteredNavItems.map((item) => {
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

          {/* More button - only for internal members */}
          {showMoreButton && (
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
          )}
        </div>
      </nav>

      {/* More Menu Modal */}
      <MobileMoreMenu isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} userRole={userRole} />
    </>
  );
}
