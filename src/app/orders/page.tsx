"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui";
import { OrdersFilterPanel } from "@/components/OrdersFilterPanel";
import { StatCard } from "@/components/StatCard";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Truck,
  X,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { format } from "@/lib/date-format";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import { OrderForm } from "@/components/forms/OrderForm";
import { toast } from "sonner";

interface Order {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  category: string;
  vendor?: string | null;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  delivery_progress?: "pending_delivery" | "partially_delivered" | "completed";
  ordered_qty?: number;
  delivered_qty?: number;
  remaining_qty?: number;
  delivered_value?: number;
  projects?: {
    id: string;
    name: string;
    company_id: string;
  };
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'member';
}

interface OrderStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalValue: number;
  thisMonth: number;
}

interface TabConfig {
  id: string;
  label: string;
  count?: number;
  filter?: (order: Order) => boolean;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
  const [orderDeliveries, setOrderDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchProjects();
    fetchOrders();
  }, [appliedFilters]);

  // Auto-open modal if ID is in URL (from global search)
  useEffect(() => {
    if (typeof window !== 'undefined' && orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('id');
      
      if (orderId) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          setSelectedOrder(order);
          setShowDetailModal(true);
          // Clean up URL
          window.history.replaceState({}, '', '/orders');
        }
      }
    }
  }, [orders]);

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.data || data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchDeliveries = async (orderId: string) => {
    setLoadingDeliveries(true);
    console.log('🚀 Fetching deliveries for order:', orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/deliveries`);
      console.log('📡 Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch deliveries');
      }
      const result = await response.json();
      console.log('✅ Received result:', result);
      
      // Handle wrapped response format: {ok: true, data: {deliveries: [...]}}
      const data = result.data || result;
      const deliveries = data.deliveries || [];
      
      console.log('📦 Deliveries count:', deliveries.length);
      setOrderDeliveries(deliveries);
    } catch (error) {
      console.error('❌ Error fetching deliveries:', error);
      toast.error('Failed to load deliveries', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
      setOrderDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Build query string from applied filters
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      
      const queryString = params.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ''}`;
      
      // Fetch orders from API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      // API returns {ok: true, data: orders} so we need to extract data
      const fetchedOrders: Order[] = data.data || data.orders || [];

      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
      
      // Fallback to empty state - no mock data
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): OrderStats => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const approved = orders.filter(o => o.status === 'approved').length;
    const rejected = orders.filter(o => o.status === 'rejected').length;
    
    // Total value: only count APPROVED orders
    const totalValue = orders
      .filter(o => o.status === 'approved')
      .reduce((sum, order) => {
        return sum + (order.amount || 0);
      }, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // This month: only count APPROVED orders from this month
    const thisMonth = orders
      .filter(o => o.status === 'approved' && new Date(o.created_at) >= startOfMonth)
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    return { total, pending, approved, rejected, totalValue, thisMonth };
  };

  const stats = calculateStats();

  const tabs: TabConfig[] = [
    {
      id: "all",
      label: "All Orders",
      count: orders.length,
    },
    {
      id: "pending",
      label: "Pending",
      count: orders.filter(o => o.status === 'pending').length,
      filter: (order) => order.status === 'pending',
    },
    {
      id: "approved",
      label: "Approved",
      count: orders.filter(o => o.status === 'approved').length,
      filter: (order) => order.status === 'approved',
    },
    {
      id: "rejected",
      label: "Rejected",
      count: orders.filter(o => o.status === 'rejected').length,
      filter: (order) => order.status === 'rejected',
    },
  ];

  const deliveryTabs: TabConfig[] = [
    {
      id: "pending_delivery",
      label: "Pending Delivery",
      count: orders.filter(o => o.delivery_progress === 'pending_delivery').length,
      filter: (order) => order.delivery_progress === 'pending_delivery',
    },
    {
      id: "partially_delivered",
      label: "Partial",
      count: orders.filter(o => o.delivery_progress === 'partially_delivered').length,
      filter: (order) => order.delivery_progress === 'partially_delivered',
    },
    {
      id: "completed",
      label: "Completed Delivery",
      count: orders.filter(o => o.delivery_progress === 'completed').length,
      filter: (order) => order.delivery_progress === 'completed',
    },
  ];

  const filteredOrders = orders.filter((order) => {
    // Check both status tabs and delivery tabs
    const statusTab = tabs.find(tab => tab.id === activeTab);
    const deliveryTab = deliveryTabs.find(tab => tab.id === activeTab);
    
    const matchesTab = activeTab === "all" || 
                      (statusTab && statusTab.filter?.(order)) ||
                      (deliveryTab && deliveryTab.filter?.(order));
    
    const matchesSearch = !searchQuery || 
                         order.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const handleDecision = async () => {
    if (!selectedOrder) return;

    try {
      // Update order status via API
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: decisionAction === 'approve' ? 'approved' : 'rejected',
          rejection_reason: decisionAction === 'reject' ? decisionNotes : undefined,
          notes: decisionNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update order: ${response.status}`);
      }

      const data = await response.json();
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === selectedOrder.id ? data.order : order
      ));

      setDecisionModalOpen(false);
      setSelectedOrder(null);
      setDecisionNotes('');
      
      // Show success toast
      toast.success(`Order ${decisionAction}d successfully!`, {
        description: decisionAction === 'approve' 
          ? 'The order has been approved.' 
          : 'The order has been rejected.',
        duration: 3000,
      });

      // Refresh orders list
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order', {
        description: error instanceof Error ? error.message : 'An error occurred',
        duration: 5000,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeliveryProgressIcon = (progress: string) => {
    switch (progress) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partially_delivered': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'pending_delivery': return <Package className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDeliveryProgressColor = (progress: string) => {
    switch (progress) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'partially_delivered': return 'bg-blue-100 text-blue-700';
      case 'pending_delivery': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeliveryProgressLabel = (progress: string) => {
    switch (progress) {
      case 'completed': return 'Completed';
      case 'partially_delivered': return 'Partial';
      case 'pending_delivery': return 'Pending Delivery';
      default: return 'N/A';
    }
  };

  const canDecide = userProfile?.role && ['owner', 'admin', 'manager'].includes(userProfile.role);

  if (loading) {
    return (
      <AppLayout title="Orders" description="Manage product orders and procurement">
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 animate-pulse">
                <div className="h-5 md:h-6 bg-gray-200 rounded mb-2" />
                <div className="h-6 md:h-8 bg-gray-200 rounded mb-2" />
                <div className="h-3 md:h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Orders"
      description="Manage product orders and procurement"
      actions={
        <div className="hidden md:flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowNewOrderModal(true)}
          >
            New Order
          </Button>
        </div>
      }
    >
      <div className="space-y-3 md:space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <StatCard
            title="Total Orders"
            value={stats.total}
            icon={ShoppingCart}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />

          <StatCard
            title="Pending Approval"
            value={stats.pending}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
            badge={stats.pending}
            badgeColor="text-yellow-600"
          />

          <StatCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
            badge={stats.approved}
            badgeColor="text-green-600"
          />

          <StatCard
            title="Total Value"
            value={formatCurrency(stats.totalValue)}
            icon={DollarSign}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
            badge={`${((stats.thisMonth / (stats.totalValue || 1)) * 100).toFixed(0)}%`}
            badgeColor="text-purple-600"
          />
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3 md:p-4 border-b border-gray-200">
            {/* Filter Panel */}
            <OrdersFilterPanel 
              onFiltersChange={setAppliedFilters}
              projects={projects}
            />

            {/* Search Bar */}
            <div className="mt-3">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search orders..."
              />
            </div>

            {/* Status Tabs */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Status</div>
              <div className="flex flex-wrap gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={cn(
                          "ml-2 px-2 py-0.5 rounded-full text-xs",
                          activeTab === tab.id
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Delivery Progress</div>
              <div className="flex flex-wrap gap-1">
                {deliveryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                      activeTab === tab.id
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={cn(
                          "ml-2 px-2 py-0.5 rounded-full text-xs",
                          activeTab === tab.id
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first order"}
                </p>
                <Button 
                  variant="primary" 
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowNewOrderModal(true)}
                >
                  Create Order
                </Button>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{order.description}</h4>
                          <span className="text-sm text-gray-500">({order.category})</span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center",
                            getStatusColor(order.status)
                          )}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </span>
                          {order.delivery_progress && (
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium inline-flex items-center",
                              getDeliveryProgressColor(order.delivery_progress)
                            )}>
                              {getDeliveryProgressIcon(order.delivery_progress)}
                              <span className="ml-1">{getDeliveryProgressLabel(order.delivery_progress)}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Project: {order.projects?.name || 'N/A'}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>Created {format(new Date(order.created_at), "MMM dd, yyyy")}</span>
                          {order.approved_at && (
                            <span>Approved {format(new Date(order.approved_at), "MMM dd, yyyy")}</span>
                          )}
                          {order.rejected_at && (
                            <span>Rejected {format(new Date(order.rejected_at), "MMM dd, yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:self-start">
                      <div className="sm:text-right text-left w-full sm:w-auto">
                        <div className="text-lg font-bold text-gray-900 whitespace-nowrap sm:whitespace-normal">
                          {formatCurrency(order.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.category}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-4 w-4" />}
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                        >
                        </Button>
                        {canDecide && order.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<CheckCircle className="h-4 w-4" />}
                              onClick={() => {
                                setSelectedOrder(order);
                                setDecisionAction('approve');
                                setDecisionModalOpen(true);
                              }}
                            >
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<XCircle className="h-4 w-4" />}
                              onClick={() => {
                                setSelectedOrder(order);
                                setDecisionAction('reject');
                                setDecisionModalOpen(true);
                              }}
                            >
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDecisionModalOpen(false);
              setSelectedOrder(null);
              setDecisionNotes('');
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {decisionAction === 'approve' ? 'Approve' : 'Reject'} Order
            </h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{selectedOrder.description}</h4>
              <p className="text-sm text-gray-600">
                Category: {selectedOrder.category} • 
                Total: {formatCurrency(selectedOrder.amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Project: {selectedOrder.projects?.name}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {decisionAction === 'approve' ? 'Approval' : 'Rejection'} Notes
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Add notes for this ${decisionAction}...`}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setDecisionModalOpen(false);
                  setSelectedOrder(null);
                  setDecisionNotes('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={decisionAction === 'approve' ? 'primary' : 'danger'}
                onClick={handleDecision}
                className="flex-1"
              >
                {decisionAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewOrderModal(false);
          }}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create New Order</h2>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <OrderForm
                isModal={true}
                onSuccess={(order) => {
                  setShowNewOrderModal(false);
                  fetchOrders(); // Refresh orders list
                  toast.success('Order created successfully!', {
                    description: 'The order has been added to the list.',
                    duration: 3000,
                  });
                }}
                onCancel={() => setShowNewOrderModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200 md:flex md:items-center md:justify-center md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedOrder(null);
            }
          }}
        >
          {/* Full screen on mobile, centered modal on desktop */}
          <div className="bg-white h-full w-full md:h-auto md:max-h-[85vh] md:rounded-xl md:max-w-2xl md:w-full flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
              {/* Order Information */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-semibold text-base md:text-lg text-gray-900 mb-2">{selectedOrder.description}</h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedOrder.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatCurrency(selectedOrder.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Project:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedOrder.projects?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={cn(
                        "ml-2 px-2 py-1 rounded-full text-xs font-medium",
                        getStatusColor(selectedOrder.status)
                      )}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {format(new Date(selectedOrder.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                      </span>
                    </div>
                    {selectedOrder.approved_at && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Approved:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {format(new Date(selectedOrder.approved_at), "MMM dd, yyyy 'at' hh:mm a")}
                        </span>
                      </div>
                    )}
                    {selectedOrder.rejected_at && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Rejected:</span>
                        <span className="ml-2 font-medium text-red-600">
                          {format(new Date(selectedOrder.rejected_at), "MMM dd, yyyy 'at' hh:mm a")}
                        </span>
                      </div>
                    )}
                    {selectedOrder.rejection_reason && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Rejection Reason:</span>
                        <p className="mt-1 text-gray-900">{selectedOrder.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Progress Section */}
                {selectedOrder.delivery_progress && (
                  <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <h4 className="font-semibold text-sm md:text-base text-gray-900 flex items-center gap-2">
                        <Truck className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                        Delivery Progress
                      </h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center",
                        getDeliveryProgressColor(selectedOrder.delivery_progress)
                      )}>
                        {getDeliveryProgressIcon(selectedOrder.delivery_progress)}
                        <span className="ml-1">{getDeliveryProgressLabel(selectedOrder.delivery_progress)}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
                      <div className="bg-white rounded p-2">
                        <span className="text-gray-500 block text-xs">Ordered Qty</span>
                        <span className="font-semibold text-gray-900 text-base md:text-lg">
                          {selectedOrder.ordered_qty?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="text-gray-500 block text-xs">Delivered Qty</span>
                        <span className="font-semibold text-blue-600 text-base md:text-lg">
                          {selectedOrder.delivered_qty?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="text-gray-500 block text-xs">Remaining Qty</span>
                        <span className="font-semibold text-orange-600 text-base md:text-lg">
                          {selectedOrder.remaining_qty?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="bg-white rounded p-2">
                        <span className="text-gray-500 block text-xs">Delivered Value</span>
                        <span className="font-semibold text-green-600 text-base md:text-lg">
                          {formatCurrency(selectedOrder.delivered_value || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-3">
                      <Button
                        variant="accent"
                        leftIcon={<Truck className="h-4 w-4" />}
                        onClick={() => {
                          fetchDeliveries(selectedOrder.id);
                          setShowDeliveriesModal(true);
                        }}
                        className="w-full"
                      >
                        View Deliveries
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer with Action Buttons */}
            <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                {/* Cancel button - always visible */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedOrder(null);
                  }}
                  className="flex-1 order-last sm:order-first"
                >
                  Close
                </Button>
                
                {/* Approve/Reject buttons - show for pending orders */}
                {selectedOrder.status === 'pending' && (
                  <>
                    <Button
                      variant="danger"
                      leftIcon={<XCircle className="h-4 w-4" />}
                      onClick={() => {
                        setDecisionAction('reject');
                        setShowDetailModal(false);
                        setDecisionModalOpen(true);
                      }}
                      className="flex-1"
                    >
                      Reject Order
                    </Button>
                    <Button
                      variant="primary"
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                      onClick={() => {
                        setDecisionAction('approve');
                        setShowDetailModal(false);
                        setDecisionModalOpen(true);
                      }}
                      className="flex-1"
                    >
                      Approve Order
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries Modal */}
      {showDeliveriesModal && selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200 md:flex md:items-center md:justify-center md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeliveriesModal(false);
              setOrderDeliveries([]);
            }
          }}
        >
          <div className="bg-white h-full w-full md:h-auto md:max-h-[85vh] md:rounded-xl md:max-w-4xl md:w-full flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Deliveries for Order</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">{selectedOrder.description}</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <Link href="/deliveries">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Delivery</span>
                  </Button>
                </Link>
                <button
                  onClick={() => {
                    setShowDeliveriesModal(false);
                    setOrderDeliveries([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDeliveries ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading deliveries...</span>
                </div>
              ) : orderDeliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries yet</h3>
                  <p className="text-gray-500 mb-6">
                    Deliveries for this order will appear here once they are created.
                  </p>
                  <Link href="/deliveries">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Delivery
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderDeliveries.map((delivery: any) => (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            delivery.status === 'delivered' ? 'bg-green-100' :
                            delivery.status === 'in_transit' ? 'bg-blue-100' :
                            delivery.status === 'cancelled' ? 'bg-red-100' : 'bg-yellow-100'
                          )}>
                            <Truck className={cn(
                              "h-5 w-5",
                              delivery.status === 'delivered' ? 'text-green-600' :
                              delivery.status === 'in_transit' ? 'text-blue-600' :
                              delivery.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {format(new Date(delivery.delivery_date), "MMM dd, yyyy")}
                              </h4>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                delivery.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                                delivery.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                              )}>
                                {delivery.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Driver: {delivery.driver_name || 'N/A'} • Vehicle: {delivery.vehicle_number || 'N/A'}
                            </p>
                            {delivery.notes && (
                              <p className="text-sm text-gray-500 mt-1">{delivery.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(delivery.total_amount || 0)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Items */}
                      {delivery.delivery_items && delivery.delivery_items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Items:</h5>
                          <div className="space-y-1">
                            {delivery.delivery_items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.product_name} ({item.quantity} {item.unit})
                                </span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(item.total_price || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeliveriesModal(false);
                  setOrderDeliveries([]);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}