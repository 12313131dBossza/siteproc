"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import { useWhiteLabel } from '@/lib/WhiteLabelContext';
import {
  LayoutDashboard,
  Package,
  Receipt,
  FileText,
  ShoppingCart,
  PackageSearch,
  Users,
  Activity,
  FolderOpen,
  FileSignature,
  Building2,
  UserCheck,
  CreditCard,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  User,
  Files,
  MessageCircle,
  Truck,
  Crown,
  Sparkles,
  Zap
} from "lucide-react";

// Full navigation with required roles
// 'all' = all authenticated users can see
// 'internal' = only internal company members (admin, owner, manager, bookkeeper, member)
// 'admin' = only admin/owner
// 'viewer' = external viewers/clients can see (project-scoped data)
// 'supplier' = supplier portal only
// 'all_except_supplier' = company + clients (not suppliers)
const navigation = [
  // === Company Internal Navigation ===
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, access: 'internal' },
  { name: "Analytics", href: "/analytics", icon: BarChart3, access: 'internal' },
  { name: "Projects", href: "/projects", icon: FolderOpen, access: 'all' }, // All users can see their projects
  { name: "Messages", href: "/messages", icon: MessageCircle, access: 'all' }, // Everyone can message (supplier sees their channel)
  { name: "Orders", href: "/orders", icon: ShoppingCart, access: 'viewer' }, // Viewers see project-filtered orders
  { name: "Expenses", href: "/expenses", icon: Receipt, access: 'viewer' }, // Viewers see project-filtered expenses
  { name: "Deliveries", href: "/deliveries", icon: Package, access: 'viewer' }, // Viewers see project-filtered deliveries
  { name: "Documents", href: "/documents", icon: Files, access: 'viewer' }, // Viewers see project-filtered documents
  { name: "Change Orders", href: "/change-orders", icon: FileText, access: 'internal' },
  { name: "Products", href: "/products", icon: PackageSearch, access: 'internal' },
  { name: "Users & Roles", href: "/users", icon: Users, access: 'admin' },
  { name: "Activity Log", href: "/activity", icon: Activity, access: 'internal' },
  { name: "Bids", href: "/bids", icon: FileSignature, access: 'internal' },
  { name: "Contractors", href: "/contractors", icon: Building2, access: 'internal' },
  { name: "Clients", href: "/clients", icon: UserCheck, access: 'internal' },
  { name: "Payments", href: "/payments", icon: CreditCard, access: 'internal' },
  { name: "Reports", href: "/reports", icon: BarChart3, access: 'internal' },
  { name: "Settings", href: "/settings", icon: Settings, access: 'internal' },
  // === Supplier Portal ===
  { name: "Supplier Portal", href: "/supplier-portal", icon: Truck, access: 'supplier' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName, logoUrl } = useWhiteLabel();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
  } | null>(null);

  // Auto-sync subscription on mount (once per session)
  useEffect(() => {
    const syncSubscription = async () => {
      const lastSync = sessionStorage.getItem('sidebarPlanSync');
      const now = Date.now();
      if (!lastSync || now - parseInt(lastSync) > 300000) { // Sync every 5 minutes max
        try {
          const res = await fetch('/api/billing/sync');
          const data = await res.json();
          if (data.success) {
            sessionStorage.setItem('sidebarPlanSync', now.toString());
          }
        } catch (e) {
          // Ignore sync errors silently
        }
      }
    };
    syncSubscription();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserEmail(user.email || '');
          
          // Get profile with role and company_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, role, company_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (profile?.username) {
            setUserName(profile.username);
          } else if (user.email) {
            setUserName(user.email.split('@')[0]);
          }
          
          // Set user role
          setUserRole(profile?.role || 'viewer');

          // Fetch subscription status for internal members
          if (profile?.company_id && ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile?.role || '')) {
            try {
              const { data: company } = await supabase
                .from('companies')
                .select('plan, subscription_status')
                .eq('id', profile.company_id)
                .single();
              
              if (company) {
                setSubscription({
                  plan: company.plan || 'free',
                  status: company.subscription_status || 'inactive'
                });
              }
            } catch (e) {
              // Columns might not exist yet
              setSubscription({ plan: 'free', status: 'inactive' });
            }
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    // Internal company members (includes accountant)
    const isInternalMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(userRole);
    // Admin only items
    const isAdmin = ['admin', 'owner'].includes(userRole);
    // External viewer/client
    const isViewer = userRole === 'viewer' || userRole === 'client';
    // Supplier
    const isSupplier = userRole === 'supplier';
    
    if (item.access === 'all') return true;
    if (item.access === 'internal' && isInternalMember) return true;
    if (item.access === 'admin' && isAdmin) return true;
    // Viewers/Clients can see 'viewer' access items (project-scoped data)
    if (item.access === 'viewer' && (isViewer || isInternalMember)) return true;
    // All except suppliers (company + clients)
    if (item.access === 'all_except_supplier' && !isSupplier) return true;
    // Suppliers only see supplier portal
    if (item.access === 'supplier' && isSupplier) return true;
    
    return false;
  });

  // Don't render on mobile - bottom nav handles it
  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-white border-r border-gray-200 shadow-sm">
      {/* Logo Section - with white-label support */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        {logoUrl ? (
          <img src={logoUrl} alt={displayName} className="h-9 w-auto max-w-[180px] object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {displayName}
            </h1>
          </div>
        )}
      </div>

      {/* Subscription Status Badge */}
      {subscription && (
        <Link 
          href="/settings/billing"
          className="mx-3 mt-3 group"
        >
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
            subscription.plan === 'enterprise' 
              ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 hover:border-purple-300" 
              : subscription.plan === 'pro'
              ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200 hover:border-blue-300"
              : subscription.plan === 'starter'
              ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 hover:border-green-300"
              : "bg-gray-50 border border-gray-200 hover:border-gray-300"
          )}>
            {subscription.plan === 'enterprise' ? (
              <Crown className="h-4 w-4 text-purple-500" />
            ) : subscription.plan === 'pro' ? (
              <Zap className="h-4 w-4 text-blue-500" />
            ) : subscription.plan === 'starter' ? (
              <Sparkles className="h-4 w-4 text-green-500" />
            ) : (
              <Package className="h-4 w-4 text-gray-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-xs font-semibold capitalize",
                subscription.plan === 'enterprise' ? "text-purple-700" :
                subscription.plan === 'pro' ? "text-blue-700" :
                subscription.plan === 'starter' ? "text-green-700" :
                "text-gray-600"
              )}>
                {subscription.plan === 'free' ? 'Free Plan' : `${subscription.plan} Plan`}
              </p>
              <p className="text-[10px] text-gray-500">
                {subscription.status === 'active' ? (
                  <span className="text-green-600">● Active</span>
                ) : subscription.status === 'past_due' ? (
                  <span className="text-amber-600">● Payment Due</span>
                ) : subscription.status === 'canceled' ? (
                  <span className="text-red-600">● Canceled</span>
                ) : subscription.plan === 'free' ? (
                  <span className="text-gray-500 group-hover:text-blue-600">Upgrade →</span>
                ) : (
                  <span className="text-gray-500">● Inactive</span>
                )}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" title={userName}>
              {userName}
            </p>
            <p className="text-[10px] text-gray-500 leading-tight break-words" title={userEmail}>
              {userEmail || 'Loading...'}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}