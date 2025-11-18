'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Edit, Trash2, X, FileText, CheckCircle, XCircle, Clock, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from '@/lib/date-format';

interface Bid {
  id: string;
  vendor_name: string;
  vendor_email?: string;
  project_id?: string;
  project_name?: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  valid_until: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  order_id?: string;
  created_at: string;
  updated_at?: string;
}

export default function BidsPageClient() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    vendor_name: '',
    vendor_email: '',
    project_id: '',
    item_description: '',
    quantity: '',
    unit_price: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'converted',
    notes: ''
  });

  const fetchBids = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bids');
      if (!res.ok) throw new Error('Failed to fetch bids');
      
      const data = await res.json();
      setBids(data || []);
    } catch (error) {
      console.error('Error fetching bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      
      const json = await res.json();
      const projectsData = Array.isArray(json) ? json : (json.data || []);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchBids();
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price),
        total_amount: parseFloat(form.quantity) * parseFloat(form.unit_price)
      };

      const url = editingBid 
        ? `/api/bids/${editingBid.id}`
        : '/api/bids';

      const res = await fetch(url, {
        method: editingBid ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save bid');
      }

      toast.success(`Bid ${editingBid ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      setEditingBid(null);
      resetForm();
      fetchBids();
    } catch (error: any) {
      console.error('Error saving bid:', error);
      toast.error(error.message || 'Failed to save bid');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bid: Bid) => {
    setEditingBid(bid);
    setForm({
      vendor_name: bid.vendor_name,
      vendor_email: bid.vendor_email || '',
      project_id: bid.project_id || '',
      item_description: bid.item_description,
      quantity: bid.quantity.toString(),
      unit_price: bid.unit_price.toString(),
      valid_until: bid.valid_until,
      status: bid.status,
      notes: bid.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bid? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/bids/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete bid');
      }

      toast.success('Bid deleted successfully');
      fetchBids();
    } catch (error: any) {
      console.error('Error deleting bid:', error);
      toast.error(error.message || 'Failed to delete bid');
    } finally {
      setDeleting(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/bids/${id}/approve`, {
        method: 'POST'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve bid');
      }

      toast.success('Bid approved successfully');
      fetchBids();
    } catch (error: any) {
      console.error('Error approving bid:', error);
      toast.error(error.message || 'Failed to approve bid');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/bids/${id}/reject`, {
        method: 'POST'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject bid');
      }

      toast.success('Bid rejected successfully');
      fetchBids();
    } catch (error: any) {
      console.error('Error rejecting bid:', error);
      toast.error(error.message || 'Failed to reject bid');
    }
  };

  const handleConvertToOrder = async (id: string) => {
    if (!confirm('Convert this bid to an order? This will create a new purchase order.')) {
      return;
    }

    setConverting(id);
    try {
      const res = await fetch(`/api/bids/${id}/convert`, {
        method: 'POST'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to convert bid to order');
      }

      const data = await res.json();
      toast.success(`Bid converted to order successfully! Order ID: ${data.order_id}`);
      fetchBids();
    } catch (error: any) {
      console.error('Error converting bid:', error);
      toast.error(error.message || 'Failed to convert bid to order');
    } finally {
      setConverting(null);
    }
  };

  const resetForm = () => {
    setForm({
      vendor_name: '',
      vendor_email: '',
      project_id: '',
      item_description: '',
      quantity: '',
      unit_price: '',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      converted: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      converted: ArrowRight
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filter bids
  const filteredBids = bids.filter(bid => {
    const matchesSearch = 
      bid.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bid.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totals = filteredBids.reduce((acc, bid) => {
    acc.total += bid.total_amount;
    if (bid.status === 'pending') acc.pending += bid.total_amount;
    if (bid.status === 'approved') acc.approved += bid.total_amount;
    if (bid.status === 'converted') acc.converted += bid.total_amount;
    return acc;
  }, { total: 0, pending: 0, approved: 0, converted: 0 });

  return (
    <AppLayout
      title="Bids"
      description="Manage vendor quotations and convert to orders"
      actions={
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingBid(null);
            resetForm();
            setShowModal(true);
          }}
        >
          Add Bid
        </Button>
      }
    >
      <div className="space-y-6 p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Total Bids</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</div>
            <div className="text-xs text-gray-500 mt-1">{filteredBids.length} bids</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-700 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(totals.pending)}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.approved)}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Converted</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totals.converted)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bids..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>

        {/* Bids List */}
        {loading && bids.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading bids...</p>
            </div>
          </div>
        ) : filteredBids.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bids found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first bid'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowModal(true)}
              >
                Add Bid
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBids.map((bid) => {
              const StatusIcon = getStatusIcon(bid.status);
              const isExpired = new Date(bid.valid_until) < new Date();
              
              return (
                <div key={bid.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{bid.vendor_name}</h3>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1', getStatusBadge(bid.status))}>
                          <StatusIcon className="h-3 w-3" />
                          {bid.status}
                        </span>
                        {isExpired && bid.status === 'pending' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{bid.item_description}</p>
                      {bid.project_name && (
                        <p className="text-sm text-gray-500">Project: {bid.project_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(bid.total_amount)}</div>
                      <div className="text-sm text-gray-500">
                        {bid.quantity} × {formatCurrency(bid.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Valid until: {format(new Date(bid.valid_until), 'MMM d, yyyy')}
                    </div>
                    {bid.vendor_email && (
                      <div className="flex items-center gap-1">
                        <span>Email: {bid.vendor_email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {bid.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<CheckCircle className="h-3 w-3" />}
                          onClick={() => handleApprove(bid.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<XCircle className="h-3 w-3" />}
                          onClick={() => handleReject(bid.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {bid.status === 'approved' && !bid.order_id && (
                      <Button
                        size="sm"
                        variant="accent"
                        leftIcon={<ArrowRight className="h-3 w-3" />}
                        onClick={() => handleConvertToOrder(bid.id)}
                        loading={converting === bid.id}
                      >
                        Convert to Order
                      </Button>
                    )}
                    {bid.order_id && (
                      <span className="text-sm text-gray-500">Order ID: {bid.order_id}</span>
                    )}
                    <button
                      onClick={() => handleEdit(bid)}
                      className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bid.id)}
                      disabled={deleting === bid.id}
                      className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === bid.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">
                  {editingBid ? 'Edit Bid' : 'Add New Bid'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingBid(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.vendor_name}
                      onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ABC Suppliers"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Email
                    </label>
                    <input
                      type="email"
                      value={form.vendor_email}
                      onChange={(e) => setForm({ ...form, vendor_email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project (Optional)
                    </label>
                    <select
                      value={form.project_id}
                      onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- No Project --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={form.item_description}
                      onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the items or services..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.unit_price}
                      onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  {form.quantity && form.unit_price && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-sm text-blue-700">Total Amount</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {formatCurrency(parseFloat(form.quantity || '0') * parseFloat(form.unit_price || '0'))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBid(null);
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingBid ? 'Update Bid' : 'Create Bid'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
