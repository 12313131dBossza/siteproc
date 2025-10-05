"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
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
import { format } from "date-fns";
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchOrders();
  }, []);

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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from API
      const response = await fetch('/api/orders', {
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
    
    const totalValue = orders.reduce((sum, order) => {
      return sum + (order.amount || 0);
    }, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = orders
      .filter(o => new Date(o.created_at) >= startOfMonth)
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

  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "all" || !tabs.find(tab => tab.id === activeTab)?.filter || 
                     tabs.find(tab => tab.id === activeTab)?.filter?.(order);
    const matchesSearch = !searchQuery || 
                         order.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
        throw new Error(errorData.message || `Failed to update order: ${response.status}`);
      }

      const result = await response.json();
      const updatedOrder = result.data || result;
      
      // Update local state with the updated order
      setOrders(prev => prev.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));

      // Close modals and clear state
      setDecisionModalOpen(false);
      setSelectedOrder(null);
      setDecisionNotes('');
      
      // Show success message
      const actionText = decisionAction === 'approve' ? 'approved' : 'rejected';
      toast.success(`Order ${actionText} successfully!`, {
        description: `The order has been ${actionText} and moved to the ${actionText} tab.`,
        duration: 3000,
      });

      // Refresh the orders list to ensure we have latest data
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order', {
        description: 'Please try again or contact support.',
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

  const canDecide = userProfile?.role && ['owner', 'admin', 'manager'].includes(userProfile.role);

  if (loading) {
    return (
      <AppLayout title="Orders" description="Manage product orders and procurement">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded" />
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
        <div className="flex gap-2">
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
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</h3>
            <p className="text-sm text-gray-500">Total Orders</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-xs text-yellow-600 font-medium">{stats.pending}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pending}</h3>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">{stats.approved}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.approved}</h3>
            <p className="text-sm text-gray-500">Approved</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 font-medium">
                {((stats.thisMonth / (stats.totalValue || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalValue)}</h3>
            <p className="text-sm text-gray-500">Total Value</p>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-xs",
                        activeTab === tab.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{order.description}</h4>
                          <span className="text-sm text-gray-500">({order.category})</span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(order.status)
                          )}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Project: {order.projects?.name || 'N/A'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedOrder(null);
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Order Information */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{selectedOrder.description}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
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
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
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
    </AppLayout>
  );
}