"use client";
import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle, Search } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { ModernStatCard } from '@/components/ui/ModernStatCard';
import { DataTable } from '@/components/tables/DataTable';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';
import RoleGate from '@/components/auth/RoleGate';

interface Expense {
  id: string;
  expenseNumber: string;
  vendor: string;
  category: 'labor' | 'materials' | 'rentals' | 'other';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setExpenses([
        { id: '1', expenseNumber: 'EXP-001', vendor: 'Labor Corp', category: 'labor', amount: 2500, status: 'approved', date: '2025-08-30' },
        { id: '2', expenseNumber: 'EXP-002', vendor: 'Material Supply', category: 'materials', amount: 1200, status: 'pending', date: '2025-08-29' },
        { id: '3', expenseNumber: 'EXP-003', vendor: 'Equipment Rental', category: 'rentals', amount: 800, status: 'approved', date: '2025-08-28' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { expenses, loading, setExpenses };
}

function ExpensesContent() {
  const { expenses, loading, setExpenses } = useExpenses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    amount: '',
    notes: '',
    receiptUrl: ''
  });

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.expenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    const matchesMinAmount = !minAmount || expense.amount >= parseFloat(minAmount);
    const matchesMaxAmount = !maxAmount || expense.amount <= parseFloat(maxAmount);
    return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      id: Date.now().toString(),
      expenseNumber: `EXP-${String(expenses.length + 1).padStart(3, '0')}`,
      vendor: formData.vendor,
      category: formData.category as any,
      amount: parseFloat(formData.amount),
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    };
    setExpenses(prev => [newExpense, ...prev]);
    setFormData({ vendor: '', category: '', amount: '', notes: '', receiptUrl: '' });
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'expenseNumber', header: 'Exp #', sortable: true },
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
        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    { key: 'date', header: 'Date', sortable: true }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-200 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <PageHeader title="Expenses">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New expense
            </button>
          </PageHeader>

          {/* Filters */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="">All categories</option>
                <option value="labor">Labor</option>
                <option value="materials">Materials</option>
                <option value="rentals">Rentals</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min amount"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
              />
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Max amount"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </Section>

          {/* Stats */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModernStatCard title="Month spend" value="$24,500" trend="+8% vs last month" icon={<DollarSign className="h-5 w-5" />} />
              <ModernStatCard title="This week spend" value="$4,500" trend="+12% vs last week" icon={<TrendingUp className="h-5 w-5" />} />
              <ModernStatCard title="Pending approvals" value="3" trend="Need attention" icon={<AlertCircle className="h-5 w-5" />} />
            </div>
          </Section>

          {/* Table */}
          <Section>
            <DataTable
              columns={columns}
              data={filteredExpenses}
              emptyMessage="No expenses found. Create your first expense to get started."
            />
          </Section>

          {/* Modal */}
          <ModernModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="New Expense"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Vendor / Supplier"
                id="vendor"
                value={formData.vendor}
                onChange={(value) => setFormData(prev => ({ ...prev, vendor: value }))}
                placeholder="e.g. Home Depot, ABC Concrete, John's Trucking"
                required
              />
              <FormField
                label="Category"
                id="category"
                type="select"
                value={formData.category}
                onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                options={[
                  { value: 'labor', label: 'Labor' },
                  { value: 'materials', label: 'Materials' },
                  { value: 'rentals', label: 'Rentals' },
                  { value: 'other', label: 'Other' }
                ]}
                required
              />
              <FormField
                label="Amount"
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                placeholder="1000"
                required
              />
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
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <ExpensesContent />
    </RoleGate>
  );
}
