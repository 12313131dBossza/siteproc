"use client";
import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle, Search } from 'lucide-react';
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
  status: 'approved'; // Simplified - all approved for now
  created_at: string;
  notes?: string;
  receipt_url?: string;
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'bookkeeper' | 'member';
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    amount: '',
    notes: '',
    receiptUrl: ''
  });

  const supabase = createClient();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner' || userProfile?.role === 'bookkeeper';

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

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

  // Filter expenses locally
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

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

      const expense = await response.json();
      toast.success('Expense created successfully!');
      
      setFormData({ vendor: '', category: '', amount: '', notes: '', receiptUrl: '' });
      setIsModalOpen(false);
      fetchData(); // Refresh the list

    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create expense');
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
      render: (value: string) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
          Approved
        </span>
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
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </button>
      </PageHeader>

      {/* Filters */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModernStatCard 
            title="Total Expenses" 
            value={totalExpenses.toString()} 
            trend="All company expenses"
            icon={<DollarSign className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Total Amount" 
            value={`$${totalAmount.toLocaleString()}`} 
            trend="This period"
            icon={<TrendingUp className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Status" 
            value="All Approved" 
            trend="Ready for payment"
            icon={<AlertCircle className="h-5 w-5" />} 
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
              {searchQuery || categoryFilter 
                ? 'Try adjusting your search or filters.'
                : 'Create your first expense to get started.'
              }
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Expense
            </button>
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Expense Tracking</p>
                <p className="text-blue-700 mt-1">
                  All expenses are automatically approved and will appear in your company reports and dashboards.
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
              Create Expense
            </button>
          </div>
        </form>
      </ModernModal>
    </div>
  );
}
