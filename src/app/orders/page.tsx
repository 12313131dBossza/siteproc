"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Package, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { ModernStatCard } from '@/components/ui/ModernStatCard';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Order {
  id: string;
  product_id: string;
  qty: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  po_number: string | null;
  created_at: string;
  decided_at: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    unit: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
  decided_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'member';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const supabase = createClient();
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error('Auth error:', authErr);
        return;
      }
      
      if (user) {
        // Try to get profile with fallback handling
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .single();
          
          setUserProfile(profile || { id: user.id, role: 'member' });
        } catch (error) {
          // If profiles table doesn't exist or user has no profile, default to member
          console.log('Profile fetch failed, defaulting to member role:', error);
          setUserProfile({ id: user.id, role: 'member' });
        }
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      // Fetch orders via API
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const ordersData = await response.json();
      setOrders(ordersData);

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders locally as backup
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const approvedCount = orders.filter(o => o.status === 'approved').length;
  const totalCount = orders.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-zinc-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" showBackButton={true} backHref="/dashboard">
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </PageHeader>

      {/* Stats */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModernStatCard 
            title="Total Orders" 
            value={totalCount.toString()} 
            trend={isAdmin ? 'All company orders' : 'Your orders'}
            icon={<Package className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Pending" 
            value={pendingCount.toString()} 
            trend="Awaiting approval"
            icon={<Clock className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Approved" 
            value={approvedCount.toString()} 
            trend="Ready to fulfill"
            icon={<CheckCircle className="h-5 w-5" />} 
          />
        </div>
      </Section>

      {/* Filters */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-sm bg-transparent placeholder:text-zinc-400 flex-1"
              placeholder="Search by product name or notes..."
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="outline-none text-sm bg-transparent flex-1"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Orders List */}
      <Section>
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8 text-center">
            <Package className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No orders found</h3>
            <p className="text-zinc-500 mb-4">
              {searchQuery || statusFilter 
                ? 'Try adjusting your search or filters.'
                : 'Create your first order to get started.'
              }
            </p>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Order
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-200">
              {filteredOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {order.po_number && (
                          <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                            PO: {order.po_number}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-zinc-900 truncate">
                          {order.product?.name || 'Unknown Product'}
                        </h3>
                        <span className="text-sm text-zinc-600 ml-4">
                          Qty: {order.qty} {order.product?.unit}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-zinc-500">
                        <div className="flex items-center gap-4">
                          {order.product?.sku && (
                            <span>SKU: {order.product.sku}</span>
                          )}
                          {order.created_by_profile && (
                            <span>By: {order.created_by_profile.full_name || order.created_by_profile.email}</span>
                          )}
                        </div>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {order.notes && (
                        <p className="text-sm text-zinc-600 mt-1 truncate">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-zinc-900">
                        ${(order.product?.price || 0 * order.qty).toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        ${order.product?.price || 0} each
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
