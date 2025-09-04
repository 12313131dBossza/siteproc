"use client";
import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { ModernStatCard } from '@/components/ui/ModernStatCard';
import { DataTable } from '@/components/tables/DataTable';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  vendor: string;
  category: 'labor' | 'materials' | 'rentals' | 'other';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
  receipt_url?: string;
  user_id?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'bookkeeper' | 'member' | 'viewer';
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    amount: '',
    notes: '',
    receiptUrl: ''
  });

  const supabase = createClient();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner' || userProfile?.role === 'bookkeeper';
  const isViewer = userProfile?.role === 'viewer';
  const isMember = userProfile?.role === 'member';

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery, showAllExpenses]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (showAllExpenses && isAdmin) params.append('showAll', 'true');

      // Fetch expenses via API
      const response = await fetch(`/api/expenses?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data = await response.json();
      setExpenses(data.expenses || []);
      
      // Set user profile from API response
      if (data.userRole) {
        setUserProfile({ id: 'current-user', role: data.userRole });
      }

    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses locally as backup
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || expense.status === statusFilter;
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate stats
  const totalExpenses = expenses.length;
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const approvedCount = expenses.filter(e => e.status === 'approved').length;
  const rejectedCount = expenses.filter(e => e.status === 'rejected').length;
  const totalAmount = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: formData.vendor,
          category: formData.category,
          amount: parseFloat(formData.amount),
          notes: formData.notes || null,
          receipt_url: formData.receiptUrl || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create expense');
      }

      const result = await response.json();
      toast.success(result.message || 'Expense created successfully!');
      
      setFormData({ vendor: '', category: '', amount: '', notes: '', receiptUrl: '' });
      setIsModalOpen(false);
      fetchData(); // Refresh the list

    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create expense');
    }
  };

  const handleApproval = async (expense: Expense, action: 'approve' | 'reject') => {
    if (!isAdmin) return;
    
    setSelectedExpense(expense);
    setApprovalAction(action);
    setApprovalNotes('');
    setApprovalModalOpen(true);
  };

  const submitApproval = async () => {
    if (!selectedExpense || !isAdmin) return;

    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction,
          notes: approvalNotes || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${approvalAction} expense`);
      }

      const result = await response.json();
      toast.success(result.message || `Expense ${approvalAction}d successfully!`);
      setApprovalModalOpen(false);
      setSelectedExpense(null);
      fetchData(); // Refresh the list

    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(error instanceof Error ? error.message : `Failed to ${approvalAction} expense`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    { key: 'vendor', header: 'Vendor', sortable: true },
    { 
      key: 'category', 
      header: 'Category',
      render: (value: string) => (
        <span className="capitalize inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      )
    },
    { 
      key: 'amount', 
      header: 'Amount', 
      sortable: true,
      render: (value: number) => `$${value.toLocaleString()}`
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: string, row: Expense) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
            {getStatusIcon(value)}
            {value}
          </span>
          {isAdmin && value === 'pending' && (
            <div className="flex gap-1">
              <button
                onClick={() => handleApproval(row, 'approve')}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleApproval(row, 'reject')}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'created_at', 
      header: 'Date', 
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (value: string) => {
        return value ? (
          <span className="text-xs text-gray-600 max-w-32 truncate block" title={value}>
            {value}
          </span>
        ) : null;
      }
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" showBackButton={true} backHref="/dashboard">
        {!isViewer && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Expense
          </button>
        )}
      </PageHeader>

      {/* Role-based info banner */}
      <Section>
        <div className={`rounded-xl p-4 ${
          isAdmin ? 'bg-blue-50 border border-blue-200' : 
          isMember ? 'bg-green-50 border border-green-200' : 
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            {isAdmin ? <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" /> :
             isMember ? <Plus className="h-5 w-5 text-green-600 mt-0.5" /> :
             <Eye className="h-5 w-5 text-yellow-600 mt-0.5" />}
            <div className="text-sm">
              <p className={`font-medium ${
                isAdmin ? 'text-blue-800' : 
                isMember ? 'text-green-800' : 
                'text-yellow-800'
              }`}>
                {isAdmin ? 'Admin Access' : isMember ? 'Member Access' : 'Viewer Access'}
              </p>
              <p className={`mt-1 ${
                isAdmin ? 'text-blue-700' : 
                isMember ? 'text-green-700' : 
                'text-yellow-700'
              }`}>
                {isAdmin ? 'You can view all expenses, create new ones, and approve/reject pending expenses.' :
                 isMember ? 'You can create expenses and view your own submissions. Expenses require admin approval.' :
                 'You can view approved expenses only. Contact an admin to submit expenses.'}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Admin Toggle */}
      {isAdmin && (
        <Section>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showAllExpenses}
                onChange={(e) => setShowAllExpenses(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">Show all company expenses</span>
            </label>
            <span className="text-xs text-gray-500">
              {showAllExpenses ? 'Viewing all expenses' : 'Viewing filtered view'}
            </span>
          </div>
        </Section>
      )}

      {/* Filters */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-sm bg-transparent placeholder:text-zinc-400 flex-1"
              placeholder="Search expenses..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            {!isViewer && <option value="rejected">Rejected</option>}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All Categories</option>
            <option value="labor">Labor</option>
            <option value="materials">Materials</option>
            <option value="rentals">Rentals</option>
            <option value="other">Other</option>
          </select>
        </div>
      </Section>

      {/* Stats */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ModernStatCard 
            title="Total Expenses" 
            value={totalExpenses.toString()} 
            trend={isAdmin && showAllExpenses ? 'All company expenses' : 'Filtered view'}
            icon={<DollarSign className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Approved Total" 
            value={`$${totalAmount.toLocaleString()}`} 
            trend="Ready for payment"
            icon={<TrendingUp className="h-5 w-5" />} 
          />
          {!isViewer && (
            <ModernStatCard 
              title="Pending Approval" 
              value={pendingCount.toString()} 
              trend={isAdmin ? "Need your review" : "Awaiting approval"}
              icon={<Clock className="h-5 w-5" />} 
            />
          )}
          <ModernStatCard 
            title="Approved" 
            value={approvedCount.toString()} 
            trend="This period"
            icon={<CheckCircle className="h-5 w-5" />} 
          />
        </div>
      </Section>

      {/* Expenses Table */}
      <Section>
        {filteredExpenses.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8 text-center">
            <DollarSign className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No expenses found</h3>
            <p className="text-zinc-500 mb-4">
              {searchQuery || statusFilter || categoryFilter 
                ? 'Try adjusting your search or filters.'
                : isViewer ? 'No approved expenses available yet.' : 'Create your first expense to get started.'
              }
            </p>
            {!isViewer && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create Expense
              </button>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredExpenses}
            emptyMessage="No expenses found."
          />
        )}
      </Section>

      {/* Create Expense Modal */}
      {!isViewer && (
        <ModernModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="New Expense"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Vendor"
              id="vendor"
              value={formData.vendor}
              onChange={(value) => setFormData(prev => ({ ...prev, vendor: value }))}
              placeholder="ABC Company"
              required
            />
            <FormField
              label="Category"
              id="category"
              type="select"
              value={formData.category}
              onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              options={[
                { value: '', label: 'Select category...' },
                { value: 'labor', label: 'Labor' },
                { value: 'materials', label: 'Materials' },
                { value: 'rentals', label: 'Rentals' },
                { value: 'other', label: 'Other' }
              ]}
              required
            />
            <div className="space-y-1">
              <label htmlFor="amount" className="block text-sm font-medium text-zinc-700">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="1000"
                required
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <FormField
              label="Notes"
              id="notes"
              type="textarea"
              value={formData.notes}
              onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
              placeholder="Additional details about this expense..."
            />
            <FormField
              label="Receipt URL"
              id="receiptUrl"
              value={formData.receiptUrl}
              onChange={(value) => setFormData(prev => ({ ...prev, receiptUrl: value }))}
              placeholder="https://..."
            />
            <div className={`rounded-xl p-4 border ${
              isAdmin ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  isAdmin ? 'text-blue-600' : 'text-yellow-600'
                }`} />
                <div className="text-sm">
                  <p className={`font-medium ${
                    isAdmin ? 'text-blue-800' : 'text-yellow-800'
                  }`}>
                    {isAdmin ? 'Admin Expense Creation' : 'Expense Review Process'}
                  </p>
                  <p className={`mt-1 ${
                    isAdmin ? 'text-blue-700' : 'text-yellow-700'
                  }`}>
                    {isAdmin 
                      ? 'As an admin, your expenses will be automatically approved and appear immediately in reports.'
                      : 'Your expense will be submitted as "pending" and requires approval from an admin, owner, or bookkeeper before appearing in reports.'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {isAdmin ? 'Create & Approve' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </ModernModal>
      )}

      {/* Approval Modal */}
      {isAdmin && (
        <ModernModal
          isOpen={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedExpense(null);
            setApprovalNotes('');
          }}
          title={`${approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense`}
        >
          <div className="space-y-4">
            {selectedExpense && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Expense Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Vendor: <span className="font-medium">{selectedExpense.vendor}</span></div>
                  <div>Category: <span className="font-medium capitalize">{selectedExpense.category}</span></div>
                  <div>Amount: <span className="font-medium">${selectedExpense.amount.toLocaleString()}</span></div>
                  {selectedExpense.notes && (
                    <div>Notes: <span className="font-medium">{selectedExpense.notes}</span></div>
                  )}
                </div>
              </div>
            )}

            <p className="text-zinc-600">
              Are you sure you want to {approvalAction} this expense? 
              {approvalAction === 'approve' 
                ? ' This will make it official and include it in reports and dashboards.'
                : ' This will reject the expense and exclude it from reports.'
              }
            </p>

            <FormField
              label="Review Notes (Optional)"
              id="approvalNotes"
              type="textarea"
              value={approvalNotes}
              onChange={(value) => setApprovalNotes(value)}
              placeholder="Add any notes about your decision..."
            />

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setApprovalModalOpen(false);
                  setSelectedExpense(null);
                  setApprovalNotes('');
                }}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90 ${
                  approvalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
              </button>
            </div>
          </div>
        </ModernModal>
      )}
    </div>
  );
}
