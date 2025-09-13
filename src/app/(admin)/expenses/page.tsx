"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Plus,
  Filter,
  Download,
  Calendar,
  Receipt,
  FileText,
  Users,
  Building
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  vendor: string;
  category: 'labor' | 'materials' | 'rentals' | 'equipment' | 'transportation' | 'other';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  notes?: string;
  receipt_url?: string;
  user_id?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  project_id?: string;
  project_name?: string;
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'bookkeeper' | 'member' | 'viewer';
  display_name?: string;
}

interface ExpenseStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
  lastMonth: number;
}

interface TabConfig {
  id: string;
  label: string;
  count?: number;
  filter?: (expense: Expense) => boolean;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  const [formData, setFormData] = useState({
    vendor: '',
    category: '',
    amount: '',
    notes: '',
    receiptUrl: '',
    projectId: '',
  });

  useEffect(() => {
    fetchUserProfile();
    fetchExpenses();
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

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Mock data for now - replace with actual API call
      const mockExpenses: Expense[] = [
        {
          id: "1",
          vendor: "Steel Suppliers Co.",
          category: "materials",
          amount: 15000,
          status: "approved",
          created_at: new Date().toISOString(),
          notes: "Steel beams for foundation",
          project_name: "Downtown Office Building",
          approved_by: "John Manager",
          approved_at: new Date().toISOString(),
        },
        {
          id: "2",
          vendor: "Construction Equipment Rental",
          category: "equipment",
          amount: 2500,
          status: "pending",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          notes: "Crane rental for 3 days",
          project_name: "Riverside Apartments",
        },
        {
          id: "3",
          vendor: "Labor Contractors Inc.",
          category: "labor",
          amount: 8000,
          status: "rejected",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          notes: "Additional workers for site preparation",
          project_name: "Shopping Mall Renovation",
          approval_notes: "Exceeds approved budget",
        },
        {
          id: "4",
          vendor: "Transport Solutions",
          category: "transportation",
          amount: 750,
          status: "approved",
          created_at: new Date(Date.now() - 259200000).toISOString(),
          notes: "Material delivery to construction site",
          project_name: "Downtown Office Building",
        },
      ];

      setExpenses(mockExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): ExpenseStats => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const pending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
    const approved = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    const rejected = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonth = expenses
      .filter(e => new Date(e.created_at) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastMonth = expenses
      .filter(e => {
        const date = new Date(e.created_at);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return { total, pending, approved, rejected, thisMonth, lastMonth };
  };

  const stats = calculateStats();

  const tabs: TabConfig[] = [
    {
      id: "all",
      label: "All Expenses",
      count: expenses.length,
    },
    {
      id: "pending",
      label: "Pending",
      count: expenses.filter(e => e.status === 'pending').length,
      filter: (expense) => expense.status === 'pending',
    },
    {
      id: "approved",
      label: "Approved",
      count: expenses.filter(e => e.status === 'approved').length,
      filter: (expense) => expense.status === 'approved',
    },
    {
      id: "rejected",
      label: "Rejected",
      count: expenses.filter(e => e.status === 'rejected').length,
      filter: (expense) => expense.status === 'rejected',
    },
  ];

  const filteredExpenses = expenses.filter((expense) => {
    const matchesTab = activeTab === "all" || !tabs.find(tab => tab.id === activeTab)?.filter || 
                     tabs.find(tab => tab.id === activeTab)?.filter?.(expense);
    const matchesSearch = !searchQuery || 
                         expense.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.project_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    
    return matchesTab && matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to add expenses');
        return;
      }

      const newExpense: Partial<Expense> = {
        vendor: formData.vendor,
        category: formData.category as Expense['category'],
        amount: parseFloat(formData.amount),
        notes: formData.notes,
        receipt_url: formData.receiptUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
        user_id: user.id,
      };

      // Mock success - replace with actual API call
      const mockExpense: Expense = {
        ...newExpense,
        id: Date.now().toString(),
      } as Expense;

      setExpenses(prev => [mockExpense, ...prev]);
      setIsModalOpen(false);
      setFormData({
        vendor: '',
        category: '',
        amount: '',
        notes: '',
        receiptUrl: '',
        projectId: '',
      });
      
      toast.success('Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleApproval = async () => {
    if (!selectedExpense) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Mock success - replace with actual API call
      setExpenses(prev => prev.map(expense => 
        expense.id === selectedExpense.id 
          ? {
              ...expense,
              status: approvalAction,
              approved_by: user.email || 'Current User',
              approved_at: new Date().toISOString(),
              approval_notes: approvalNotes,
            }
          : expense
      ));

      setApprovalModalOpen(false);
      setSelectedExpense(null);
      setApprovalNotes('');
      
      toast.success(`Expense ${approvalAction}d successfully`);
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'materials': return <Building className="h-4 w-4" />;
      case 'labor': return <Users className="h-4 w-4" />;
      case 'equipment': return <FileText className="h-4 w-4" />;
      case 'transportation': return <Calendar className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const canApprove = userProfile?.role && ['owner', 'admin', 'bookkeeper'].includes(userProfile.role);

  if (loading) {
    return (
      <AppLayout title="Expenses" description="Manage and track project expenses">
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
      title="Expenses"
      description="Manage and track project expenses"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
            Add Expense
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
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.total)}</h3>
            <p className="text-sm text-gray-500">Total Expenses</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-xs text-yellow-600 font-medium">
                {expenses.filter(e => e.status === 'pending').length}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.pending)}</h3>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                {expenses.filter(e => e.status === 'approved').length}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.approved)}</h3>
            <p className="text-sm text-gray-500">Approved</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 font-medium">
                {((stats.thisMonth - stats.lastMonth) / (stats.lastMonth || 1) * 100).toFixed(0)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.thisMonth)}</h3>
            <p className="text-sm text-gray-500">This Month</p>
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

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  <option value="materials">Materials</option>
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="transportation">Transportation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="divide-y divide-gray-200">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500">
                  {searchQuery || categoryFilter
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by adding your first expense"}
                </p>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{expense.vendor}</h4>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(expense.status)
                          )}>
                            {getStatusIcon(expense.status)}
                            <span className="ml-1">{expense.status}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                          {expense.project_name && (
                            <span className="text-blue-600 ml-2">• {expense.project_name}</span>
                          )}
                        </p>
                        {expense.notes && (
                          <p className="text-sm text-gray-500 mb-2">{expense.notes}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{format(new Date(expense.created_at), "MMM dd, yyyy")}</span>
                          {expense.approved_by && (
                            <span>Approved by {expense.approved_by}</span>
                          )}
                          {expense.approval_notes && (
                            <span>Note: {expense.approval_notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-4 w-4" />}
                          onClick={() => setSelectedExpense(expense)}
                        >
                        </Button>
                        {canApprove && expense.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<CheckCircle className="h-4 w-4" />}
                              onClick={() => {
                                setSelectedExpense(expense);
                                setApprovalAction('approve');
                                setApprovalModalOpen(true);
                              }}
                            >
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<XCircle className="h-4 w-4" />}
                              onClick={() => {
                                setSelectedExpense(expense);
                                setApprovalAction('reject');
                                setApprovalModalOpen(true);
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

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  required
                  value={formData.vendor}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="materials">Materials</option>
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="transportation">Transportation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Add Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
            </h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{selectedExpense.vendor}</h4>
              <p className="text-sm text-gray-600">{formatCurrency(selectedExpense.amount)}</p>
              {selectedExpense.notes && (
                <p className="text-sm text-gray-500 mt-1">{selectedExpense.notes}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {approvalAction === 'approve' ? 'Approval' : 'Rejection'} Notes
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Add notes for this ${approvalAction}...`}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setApprovalModalOpen(false);
                  setSelectedExpense(null);
                  setApprovalNotes('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant={approvalAction === 'approve' ? 'primary' : 'destructive'}
                onClick={handleApproval}
                className="flex-1"
              >
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}