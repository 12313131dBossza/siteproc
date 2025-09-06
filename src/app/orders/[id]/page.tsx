"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, User, Calendar, FileText, ShoppingCart, Truck, Plus } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';
import RecordDeliveryModal from '@/components/ui/RecordDeliveryModal';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Order {
  id: string;
  product_id: string;
  qty: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'partially_delivered' | 'delivered';
  po_number: string | null;
  created_at: string;
  decided_at: string | null;
  total_amount?: number;
  supplier_name?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    unit: string;
    category: string;
    stock: number;
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
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  ordered_qty: number;
  delivered_qty: number;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

interface Delivery {
  id: string;
  order_id: string;
  product_id: string;
  delivered_qty: number;
  delivered_at: string;
  note?: string;
  proof_url?: string;
  created_at: string;
  products: {
    name: string;
    sku: string;
    unit: string;
  };
  profiles: {
    full_name: string;
  };
}

interface UserProfile {
  id: string;
  role: 'viewer' | 'bookkeeper' | 'manager' | 'admin';
}

export default function OrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    action: '' as 'approve' | 'reject' | '',
    po_number: ''
  });
  
  // Delivery-related state
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const orderId = params.id as string;

  const isAdmin = userProfile?.role === 'admin';
  const canMakeDecision = isAdmin && order?.status === 'pending';
  const canRecordDeliveries = (userProfile?.role === 'admin' || userProfile?.role === 'bookkeeper' || userProfile?.role === 'manager') && 
    (order?.status === 'approved' || order?.status === 'partially_delivered');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      fetchUserProfile();
      fetchDeliveries();
    }
  }, [orderId]);

  const fetchDeliveries = async () => {
    if (!orderId) return;
    
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/order-deliveries?order_id=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleRecordDelivery = (orderItem: OrderItem) => {
    setSelectedOrderItem({
      order_id: orderItem.order_id,
      product_id: orderItem.product_id,
      product_name: orderItem.product.name,
      sku: orderItem.product.sku,
      unit: orderItem.product.unit,
      ordered_qty: orderItem.ordered_qty,
      delivered_qty: orderItem.delivered_qty || 0,
    } as any);
    setShowDeliveryModal(true);
  };

  const handleDeliverySuccess = () => {
    toast.success('Delivery recorded successfully!');
    fetchOrder(); // Refresh order to get updated delivery status
    fetchDeliveries(); // Refresh delivery list
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get profile with fallback handling (same as main orders page)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .single();
          
          setUserProfile(profile || { id: user.id, role: 'viewer' });
        } catch (error) {
          // If profiles table doesn't exist or user has no profile, default to member
          console.log('Profile fetch failed, defaulting to member role:', error);
          setUserProfile({ id: user.id, role: 'member' });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Default to viewer role, not admin
      setUserProfile({ id: 'unknown', role: 'viewer' });
    }
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Simplified query without profiles joins - handle column name differences
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - either doesn't exist or no permission
          toast.error('Order not found or access denied');
          router.push('/orders');
          return;
        }
        throw error;
      }

      // Normalize the data to handle different column names
      const normalizedOrder = {
        ...data,
        notes: data.notes || data.note || null,  // Handle both 'notes' and 'note' columns
        created_by: data.created_by || data.user_id || null,  // Handle both column names
      };

      setOrder(normalizedOrder);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'approve' | 'reject') => {
    setDecisionForm({ action, po_number: '' });
    setShowDecisionModal(true);
  };

  const submitDecision = async () => {
    if (!decisionForm.action || !order) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: decisionForm.action,
          po_number: decisionForm.po_number || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update order');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      setShowDecisionModal(false);
      setDecisionForm({ action: '', po_number: '' });
      
      toast.success(`Order ${decisionForm.action}d successfully!`);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />;
      case 'approved': return <CheckCircle className="h-5 w-5" />;
      case 'rejected': return <XCircle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'partially_delivered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-200 rounded-2xl h-48 animate-pulse" />
            <div className="bg-zinc-200 rounded-2xl h-32 animate-pulse" />
          </div>
          <div className="bg-zinc-200 rounded-2xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order Not Found">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
        </PageHeader>
      </div>
    );
  }

  const totalCost = order.product ? order.product.price * order.qty : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`Order #${order.id.slice(-8)}`}>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Product Info */}
          <Section>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.status)}
                <div>
                  <h2 className="text-lg font-medium text-zinc-900">Order Status</h2>
                  <div className={`inline-flex px-3 py-1 text-sm rounded-full border font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                </div>
              </div>
              {order.po_number && (
                <div className="text-right">
                  <div className="text-sm text-zinc-500">PO Number</div>
                  <div className="font-medium text-zinc-900">{order.po_number}</div>
                </div>
              )}
            </div>

            {order.product && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-50">
                    <Package className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-zinc-900 mb-2">{order.product.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {order.product.sku && (
                        <div>
                          <span className="text-zinc-500">SKU:</span>
                          <span className="ml-1 text-zinc-900">{order.product.sku}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Price:</span>
                        <span className="ml-1 text-zinc-900">${order.product.price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Quantity:</span>
                        <span className="ml-1 text-zinc-900">{order.qty} {order.product.unit}</span>
                      </div>
                      {order.product.category && (
                        <div>
                          <span className="text-zinc-500">Category:</span>
                          <span className="ml-1 text-zinc-900">{order.product.category}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Available Stock:</span>
                        <span className="ml-1 text-zinc-900">{order.product.stock} {order.product.unit}</span>
                      </div>
                      <div className="font-medium">
                        <span className="text-zinc-500">Total:</span>
                        <span className="ml-1 text-zinc-900">${totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Delivery Panel - Show for approved orders */}
          {(order.status === 'approved' || order.status === 'partially_delivered' || order.status === 'delivered') && (
            <Section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-medium text-zinc-900">Deliveries</h2>
                </div>
                {canRecordDeliveries && order.order_items && order.order_items.some(item => (item.delivered_qty || 0) < item.ordered_qty) && (
                  <button
                    onClick={() => {
                      // For single product orders, use the first item
                      const firstItem = order.order_items?.[0];
                      if (firstItem) {
                        handleRecordDelivery(firstItem);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Record Delivery
                  </button>
                )}
              </div>

              {/* Order Items with Delivery Status */}
              {order.order_items && order.order_items.length > 0 ? (
                <div className="space-y-4">
                  {order.order_items.map((item) => {
                    const remainingQty = item.ordered_qty - (item.delivered_qty || 0);
                    const deliveryProgress = item.ordered_qty > 0 ? ((item.delivered_qty || 0) / item.ordered_qty) * 100 : 0;
                    
                    return (
                      <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-zinc-900">{item.product.name}</h3>
                            <p className="text-sm text-zinc-500">SKU: {item.product.sku}</p>
                          </div>
                          {canRecordDeliveries && remainingQty > 0 && (
                            <button
                              onClick={() => handleRecordDelivery(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
                            >
                              <Plus className="h-3 w-3" />
                              Record
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-zinc-500">Ordered:</span>
                            <span className="ml-1 font-medium">{item.ordered_qty} {item.product.unit}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Delivered:</span>
                            <span className="ml-1 font-medium text-green-600">{item.delivered_qty || 0} {item.product.unit}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Remaining:</span>
                            <span className="ml-1 font-medium text-blue-600">{remainingQty} {item.product.unit}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Progress:</span>
                            <span className="ml-1 font-medium">{deliveryProgress.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              deliveryProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(deliveryProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                  <p>No delivery information available</p>
                </div>
              )}

              {/* Recent Deliveries */}
              {deliveries.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-zinc-900 mb-4">Recent Deliveries</h3>
                  <div className="space-y-3">
                    {deliveries.slice(0, 3).map((delivery) => (
                      <div key={delivery.id} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                        <div className="p-2 rounded-full bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-zinc-900">{delivery.products.name}</span>
                            <span className="text-sm text-zinc-500">
                              {formatDistanceToNow(new Date(delivery.delivered_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm text-zinc-600">
                            <span className="font-medium">{delivery.delivered_qty} {delivery.products.unit}</span>
                            {' '}delivered by {delivery.profiles.full_name}
                          </div>
                          {delivery.note && (
                            <p className="text-sm text-zinc-500 mt-1">{delivery.note}</p>
                          )}
                          {delivery.proof_url && (
                            <a
                              href={delivery.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                            >
                              View Proof →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {deliveries.length > 3 && (
                      <Link
                        href={`/order-deliveries?order_id=${order.id}`}
                        className="block text-center py-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        View All {deliveries.length} Deliveries →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Notes */}
          {order.notes && (
            <Section>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-zinc-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-zinc-900 mb-2">Order Notes</h3>
                  <p className="text-zinc-600 whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Panel */}
          {canMakeDecision && (
            <Section>
              <h3 className="font-medium text-zinc-900 mb-4">Admin Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleDecision('approve')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Order
                </button>
                <button
                  onClick={() => handleDecision('reject')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Order
                </button>
              </div>
            </Section>
          )}

          {/* Order Timeline */}
          <Section>
            <h3 className="font-medium text-zinc-900 mb-4">Order Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-zinc-900">Order Created</div>
                  <div className="text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-zinc-600 mt-1">
                    Order #{order.id.slice(-8)}
                  </div>
                </div>
              </div>

              {order.decided_at && (
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${order.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {order.status === 'approved' ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> :
                      <XCircle className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900">
                      Order {order.status === 'approved' ? 'Approved' : 'Rejected'}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(order.decided_at).toLocaleDateString()} at {new Date(order.decided_at).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-zinc-600 mt-1">
                      Decision made
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Quick Stats */}
          <Section>
            <h3 className="font-medium text-zinc-900 mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order ID:</span>
                <span className="text-zinc-900 font-mono">#{order.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-zinc-900 capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Quantity:</span>
                <span className="text-zinc-900">{order.qty} {order.product?.unit}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-zinc-200">
                <span className="text-zinc-500">Total Cost:</span>
                <span className="text-zinc-900">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Decision Modal */}
      <ModernModal
        isOpen={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title={`${decisionForm.action === 'approve' ? 'Approve' : 'Reject'} Order`}
      >
        <div className="space-y-4">
          <p className="text-zinc-600">
            Are you sure you want to {decisionForm.action} this order for {order.qty} {order.product?.unit} of {order.product?.name}?
          </p>

          {decisionForm.action === 'approve' && (
            <FormField
              label="PO Number (Optional)"
              id="po_number"
              value={decisionForm.po_number}
              onChange={(value) => setDecisionForm(prev => ({ ...prev, po_number: value }))}
              placeholder="Enter purchase order number..."
            />
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowDecisionModal(false)}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={submitDecision}
              disabled={actionLoading}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white ${
                decisionForm.action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading ? 'Processing...' : `${decisionForm.action === 'approve' ? 'Approve' : 'Reject'} Order`}
            </button>
          </div>
        </div>
      </ModernModal>

      {/* Record Delivery Modal */}
      {selectedOrderItem && (
        <RecordDeliveryModal
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedOrderItem(null);
          }}
          onSuccess={handleDeliverySuccess}
          orderItem={selectedOrderItem}
        />
      )}
    </div>
  );
}
