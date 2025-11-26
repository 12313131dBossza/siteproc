"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
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
  Files
} from "lucide-react";

// Full navigation with required roles
// 'all' = all authenticated users can see
// 'internal' = only internal company members (admin, owner, manager, bookkeeper, member)
// 'admin' = only admin/owner
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, access: 'internal' },
  { name: "Analytics", href: "/analytics", icon: BarChart3, access: 'internal' },
  { name: "Documents", href: "/documents", icon: Files, access: 'internal' },
  { name: "Deliveries", href: "/deliveries", icon: Package, access: 'internal' },
  { name: "Expenses", href: "/expenses", icon: Receipt, access: 'internal' },
  { name: "Change Orders", href: "/change-orders", icon: FileText, access: 'internal' },
  { name: "Orders", href: "/orders", icon: ShoppingCart, access: 'internal' },
  { name: "Products", href: "/products", icon: PackageSearch, access: 'internal' },
  { name: "Users & Roles", href: "/users", icon: Users, access: 'admin' },
  { name: "Activity Log", href: "/activity", icon: Activity, access: 'internal' },
  { name: "Projects", href: "/projects", icon: FolderOpen, access: 'all' }, // All users can see their projects
  { name: "Bids", href: "/bids", icon: FileSignature, access: 'internal' },
  { name: "Contractors", href: "/contractors", icon: Building2, access: 'internal' },
  { name: "Clients", href: "/clients", icon: UserCheck, access: 'internal' },
  { name: "Payments", href: "/payments", icon: CreditCard, access: 'internal' },
  { name: "Reports", href: "/reports", icon: BarChart3, access: 'internal' },
  { name: "Settings", href: "/settings", icon: Settings, access: 'internal' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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
          
          // Get profile with role
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, role')
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
    // Internal company members
    const isInternalMember = ['admin', 'owner', 'manager', 'bookkeeper', 'member'].includes(userRole);
    // Admin only items
    const isAdmin = ['admin', 'owner'].includes(userRole);
    
    if (item.access === 'all') return true;
    if (item.access === 'internal' && isInternalMember) return true;
    if (item.access === 'admin' && isAdmin) return true;
    
    return false;
  });

  // Don't render on mobile - bottom nav handles it
  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-white border-r border-gray-200 shadow-sm">
      {/* Logo Section */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SP</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SiteProc
          </h1>
        </div>
      </div>

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