'use client';

import { useState, useEffect } from 'react';
import { useCompanyId } from '@/lib/useCompanyId';
import { Plus, Search, DollarSign, Edit, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { format } from '@/lib/date-format';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';
import { FormModal, FormModalActions, Input, Select, TextArea, SearchBar } from '@/components/ui';
import { PaymentsFilterPanel } from '@/components/PaymentsFilterPanel';
import { SortControl, sortArray } from "@/components/SortControl";

interface Payment {
  id: string;
  company_id: string;
  project_id?: string;
  order_id?: string;
  expense_id?: string;
  vendor_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
  updated_at?: string;
  projects?: { name: string };
  purchase_orders?: { id: string; vendor: string };
  expenses?: { id: string; vendor: string };
}

export default function PaymentsPageClient() {
  const companyId = useCompanyId();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filters, setFilters] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    vendor_name: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    reference_number: '',
    notes: '',
    status: 'unpaid' as 'unpaid' | 'partial' | 'paid',
    project_id: '',
    order_id: '',
    expense_id: ''
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/payments', window.location.origin);
      url.searchParams.set('limit', '100');
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString(), {
        headers: { 'x-company-id': companyId }
      });

      if (!res.ok) throw new Error('Failed to fetch payments');

      const data = await res.json();
      setPayments(data.items || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [companyId, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        project_id: form.project_id || null,
        order_id: form.order_id || null,
        expense_id: form.expense_id || null,
      };

      const url = editingPayment 
        ? `/api/payments/${editingPayment.id}`
        : '/api/payments';

      const res = await fetch(url, {
        method: editingPayment ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': companyId
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save payment');
      }

      // Reset form and close modal
      setForm({
        vendor_name: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'check',
        reference_number: '',
        notes: '',
        status: 'unpaid',
        project_id: '',
        order_id: '',
        expense_id: ''
      });
      setShowModal(false);
      setEditingPayment(null);
      fetchPayments();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      alert(error.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setForm({
      vendor_name: payment.vendor_name,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number || '',
      notes: payment.notes || '',
      status: payment.status,
      project_id: payment.project_id || '',
      order_id: payment.order_id || '',
      expense_id: payment.expense_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
        headers: { 'x-company-id': companyId }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete payment');
      }

      fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      alert(error.message || 'Failed to delete payment');
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      unpaid: 'bg-red-100 text-red-700 border-red-200',
      partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      paid: 'bg-green-100 text-green-700 border-green-200'
    };
    return styles[status as keyof typeof styles] || styles.unpaid;
  };

  // Filter payments based on search
  let filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Advanced filters
    const matchesStatus = !filters.status || payment.status === filters.status;
    
    // Payment method filter
    const matchesMethod = !filters.paymentMethod || payment.payment_method === filters.paymentMethod;
    
    // Vendor filter
    const matchesVendor = !filters.vendor || payment.vendor_name.toLowerCase().includes(filters.vendor.toLowerCase());
    
    // Date range filter
    const matchesDateRange = (!filters.startDate || new Date(payment.payment_date) >= new Date(filters.startDate)) &&
                             (!filters.endDate || new Date(payment.payment_date) <= new Date(filters.endDate));
    
    // Amount range filter
    const matchesAmountRange = (!filters.minAmount || payment.amount >= Number(filters.minAmount)) &&
                               (!filters.maxAmount || payment.amount <= Number(filters.maxAmount));
    
    return matchesSearch && matchesStatus && matchesMethod && matchesVendor && matchesDateRange && matchesAmountRange;
  });

  // Apply sorting
  if (sortBy) {
    filteredPayments = sortArray(filteredPayments, sortBy, sortOrder, (item, key) => {
      if (key === 'payment_date') return new Date(item.payment_date).getTime();
      if (key === 'amount') return item.amount;
      if (key === 'vendor_name') return item.vendor_name;
      if (key === 'status') return item.status;
      return item[key as keyof Payment];
    });
  }

  // Calculate totals
  const totals = filteredPayments.reduce((acc, p) => {
    acc.total += p.amount;
    if (p.status === 'paid') acc.paid += p.amount;
    if (p.status === 'unpaid') acc.unpaid += p.amount;
    if (p.status === 'partial') acc.partial += p.amount;
    return acc;
  }, { total: 0, paid: 0, unpaid: 0, partial: 0 });

  return (
    <AppLayout
      title="Payments"
      description="Track and manage all payments across projects"
      actions={
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingPayment(null);
            setForm({
              vendor_name: '',
              amount: '',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'check',
              reference_number: '',
              notes: '',
              status: 'unpaid',
              project_id: '',
              order_id: '',
              expense_id: ''
            });
            setShowModal(true);
          }}
        >
          Add Payment
        </Button>
      }
    >
      <div className="space-y-6 p-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</div>
          <div className="text-xs text-gray-500 mt-1">{filteredPayments.length} payments</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Paid</div>
          <div className="text-2xl font-bold text-green-900">{formatCurrency(totals.paid)}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-700 mb-1">Partial</div>
          <div className="text-2xl font-bold text-yellow-900">{formatCurrency(totals.partial)}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700 mb-1">Unpaid</div>
          <div className="text-2xl font-bold text-red-900">{formatCurrency(totals.unpaid)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by vendor, reference, or project..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PaymentsFilterPanel onFiltersChange={setFilters} />
        
        <SortControl
          options={[
            { label: 'Payment Date', value: 'payment_date' },
            { label: 'Amount', value: 'amount' },
            { label: 'Vendor', value: 'vendor_name' },
            { label: 'Status', value: 'status' },
          ]}
          onSortChange={(sortBy, sortOrder) => {
            setSortBy(sortBy);
            setSortOrder(sortOrder);
          }}
        />
      </div>

      {/* Payments Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading && payments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            Loading payments...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first payment'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Payment
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Vendor</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Method</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Reference</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{payment.vendor_name}</div>
                      {payment.projects?.name && (
                        <div className="text-xs text-gray-500">{payment.projects.name}</div>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {format(payment.payment_date, 'MMM dd, yyyy')}
                    </td>
                    <td className="p-3 text-sm capitalize text-gray-600">
                      {payment.payment_method}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {payment.reference_number || '—'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <InvoiceGenerator 
                          payment={payment}
                          companyName="SiteProc"
                          companyDetails={{
                            email: 'info@siteproc.com',
                            phone: '(555) 123-4567',
                            website: 'www.siteproc.com'
                          }}
                        />
                        <button
                          onClick={() => handleEdit(payment)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Edit payment"
                        >
                          <Edit className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          disabled={deleting === payment.id}
                          className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                          title="Delete payment"
                        >
                          {deleting === payment.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <FormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? 'Edit Payment' : 'Add New Payment'}
        description="Track vendor payments and manage payment records"
        icon={<DollarSign className="h-5 w-5" />}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Vendor Name"
            required
            value={form.vendor_name}
            onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
            placeholder="Enter vendor name"
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              leftIcon={<DollarSign className="h-4 w-4" />}
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              options={[
                { value: 'check', label: 'Check' },
                { value: 'cash', label: 'Cash' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'card', label: 'Card' },
                { value: 'ach', label: 'ACH' }
              ]}
            />

            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              options={[
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partial', label: 'Partial' },
                { value: 'paid', label: 'Paid' }
              ]}
            />
          </div>

          <Input
            label="Reference Number"
            value={form.reference_number}
            onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
            placeholder="Check #, Transaction ID, etc."
            helpText="Optional reference number for tracking"
            fullWidth
          />

          <TextArea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes about this payment"
            rows={3}
            fullWidth
          />

          <FormModalActions
            onCancel={() => {
              setShowModal(false);
              setEditingPayment(null);
            }}
            submitLabel={editingPayment ? 'Update Payment' : 'Create Payment'}
            isSubmitting={loading}
            submitDisabled={loading}
          />
        </form>
      </FormModal>
      </div>
    </AppLayout>
  );
}