"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import { usePlan } from '@/hooks/usePlan';
import { PlanId } from '@/lib/plans';
import {
  Users,
  FileText,
  HardHat,
  Settings,
  CreditCard,
  BarChart3,
  X,
  LogOut,
  Package,
  Truck,
  Receipt,
  FolderOpen,
  Activity,
  LineChart,
} from "lucide-react";

// Plan hierarchy for comparison
const PLAN_LEVELS: Record<PlanId, number> = {
  'free': 0,
  'starter': 1,
  'pro': 2,
  'enterprise': 3,
};

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
  access: 'all' | 'internal' | 'admin';
  minPlan: PlanId;
}

const moreMenuItems: MenuItem[] = [
  // Starter features
  {
    name: "Expenses",
    href: "/expenses",
    icon: Receipt,
    description: "Track project expenses",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Deliveries",
    href: "/deliveries",
    icon: Truck,
    description: "Manage deliveries",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FolderOpen,
    description: "Project documents",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    description: "Manage client relationships",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Contractors",
    href: "/contractors",
    icon: HardHat,
    description: "Contractor directory",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Payment tracking",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Activity Log",
    href: "/activity",
    icon: Activity,
    description: "View activity history",
    access: 'internal',
    minPlan: 'starter',
  },
  {
    name: "Users & Roles",
    href: "/team",
    icon: Users,
    description: "Manage team members",
    access: 'admin',
    minPlan: 'starter',
  },
  // Pro features
  {
    name: "Analytics",
    href: "/analytics",
    icon: LineChart,
    description: "Dashboard analytics",
    access: 'internal',
    minPlan: 'pro',
  },
  {
    name: "Bids",
    href: "/bids",
    icon: FileText,
    description: "View and manage bids",
    access: 'internal',
    minPlan: 'pro',
  },
  {
    name: "Products",
    href: "/products",
    icon: Package,
    description: "Product catalog",
    access: 'internal',
    minPlan: 'pro',
  },
  {
    name: "Change Orders",
    href: "/change-orders",
    icon: FileText,
    description: "Track change orders",
    access: 'internal',
    minPlan: 'pro',
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Advanced reports",
    access: 'internal',
    minPlan: 'pro',
  },
  // Always available
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "App preferences",
    access: 'internal',
    minPlan: 'starter',
  },
];

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function MobileMoreMenu({ isOpen, onClose, userRole = '' }: MobileMoreMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { plan } = usePlan();

  // Helper to check if user's plan meets minimum requirement
  const meetsMinPlan = (minPlan: PlanId): boolean => {
    const userPlanLevel = PLAN_LEVELS[plan] || 0;
    const requiredLevel = PLAN_LEVELS[minPlan] || 0;
    return userPlanLevel >= requiredLevel;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      onClose();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isOpen) return null;

  // Filter menu items based on user role AND plan level
  const isInternalMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(userRole);
  const isAdmin = ['admin', 'owner'].includes(userRole);
  
  const filteredMenuItems = moreMenuItems.filter(item => {
    // First check role-based access
    let hasRoleAccess = false;
    if (item.access === 'all') hasRoleAccess = true;
    if (item.access === 'internal' && isInternalMember) hasRoleAccess = true;
    if (item.access === 'admin' && isAdmin) hasRoleAccess = true;
    
    if (!hasRoleAccess) return false;
    
    // Then check plan-based access
    if (!meetsMinPlan(item.minPlan)) return false;
    
    return true;
  });

  // If no items to show, don't render the menu
  if (filteredMenuItems.length === 0) {
    onClose();
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Menu Modal */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{
          maxHeight: "85vh",
          animation: "slideUp 0.3s ease-out",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">More</h2>
            <p className="text-sm text-gray-500 mt-0.5">Access all features</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="overflow-y-auto px-4 py-3 pb-20" style={{ maxHeight: "calc(85vh - 140px)" }}>
          <div className="space-y-2">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95
                    ${
                      isActive
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }
                  `}
                >
                  <div
                    className={`
                    p-2.5 rounded-lg flex-shrink-0
                    ${isActive ? "bg-blue-600" : "bg-gray-100"}
                  `}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`}
                      strokeWidth={2.5}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-sm ${
                        isActive ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </div>
                    <div
                      className={`text-xs mt-0.5 truncate ${
                        isActive ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-all active:scale-95 bg-white border-2 border-red-100 hover:border-red-200 hover:bg-red-50 mt-4"
            >
              <div className="p-2.5 rounded-lg flex-shrink-0 bg-red-100">
                <LogOut className="h-5 w-5 text-red-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-semibold text-sm text-red-700">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </div>
                <div className="text-xs mt-0.5 text-red-500">
                  Sign out of your account
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
