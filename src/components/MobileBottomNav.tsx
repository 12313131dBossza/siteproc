'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@supabase/ssr';
import { usePlan } from '@/hooks/usePlan';
import { PlanId } from '@/lib/plans';
import {
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Receipt,
  MessageCircle,
  MoreHorizontal,
  Files,
  Package,
} from 'lucide-react';
import { MobileMoreMenu } from './MobileMoreMenu';

// Plan hierarchy for comparison
const PLAN_LEVELS: Record<PlanId, number> = {
  'free': 0,
  'starter': 1,
  'pro': 2,
  'enterprise': 3,
};

// Mobile nav items with access levels and minimum plan
// Access types:
// - 'all': Everyone can see
// - 'internal': Only company members
// - 'viewer': External viewers
// - 'all_except_supplier': Everyone except suppliers
// - 'client_only': Clients, viewers, consultants (read-only)
// - 'contractor': Contractors and internal members
const mobileNavItems: Array<{
  name: string;
  href: string;
  icon: any;
  access: 'all' | 'internal' | 'viewer' | 'all_except_supplier' | 'client_only' | 'contractor';
  minPlan: PlanId;
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, access: 'internal', minPlan: 'free' },
  { name: 'Projects', href: '/projects', icon: FolderOpen, access: 'all_except_supplier', minPlan: 'free' },
  { name: 'Deliveries', href: '/deliveries', icon: Package, access: 'contractor', minPlan: 'free' },
  { name: 'Documents', href: '/documents', icon: Files, access: 'all_except_supplier', minPlan: 'free' },
  // Messages requires Pro plan
  { name: 'Messages', href: '/messages', icon: MessageCircle, access: 'all_except_supplier', minPlan: 'pro' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const { plan } = usePlan();
  
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

  // Helper to check if user's plan meets minimum requirement
  const meetsMinPlan = (minPlan: PlanId): boolean => {
    const userPlanLevel = PLAN_LEVELS[plan] || 0;
    const requiredLevel = PLAN_LEVELS[minPlan] || 0;
    return userPlanLevel >= requiredLevel;
  };

  // Filter navigation based on user role and plan level
  const isInternalMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(userRole);
  const isViewer = userRole === 'viewer';
  const isSupplier = userRole === 'supplier';
  const isContractor = userRole === 'contractor';
  const isConsultant = userRole === 'consultant';
  const isClient = userRole === 'client' || isViewer || isConsultant;
  
  const filteredNavItems = mobileNavItems.filter(item => {
    // First check role-based access
    let hasAccess = false;
    if (item.access === 'all') hasAccess = true;
    if (item.access === 'internal' && isInternalMember) hasAccess = true;
    // Viewers can see 'viewer' items, internal members can too
    if (item.access === 'viewer' && (isViewer || isInternalMember)) hasAccess = true;
    // All except suppliers (includes contractors, consultants, clients)
    if (item.access === 'all_except_supplier' && !isSupplier) hasAccess = true;
    // Client only items - accessible to clients, viewers, consultants, and internal members
    if (item.access === 'client_only' && (isClient || isInternalMember)) hasAccess = true;
    // Contractor access - for deliveries page
    if (item.access === 'contractor' && (isContractor || isInternalMember)) hasAccess = true;
    
    // If no role access, reject
    if (!hasAccess) return false;
    
    // Then check plan-based access
    if (!meetsMinPlan(item.minPlan)) {
      return false;
    }
    
    return true;
  });

  // Only show More button for internal members
  const showMoreButton = isInternalMember;

  return (
    <>
      <nav className="md:hidden flex-shrink-0 bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-14">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200',
                  'active:scale-95',
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500'
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-b-full" />
                )}
                
                {/* Icon */}
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                
                {/* Label */}
                <span className={cn(
                  'text-[9px] leading-tight',
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
                'relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200',
                'active:scale-95',
                'text-gray-500'
              )}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
              <span className="text-[9px] leading-tight font-medium">
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
