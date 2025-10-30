"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { FormModal, FormModalActions, Input, Select, TextArea, SearchBar, FilterPanel, useFilters } from '@/components/ui';
import { StatCard } from "@/components/StatCard";
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
import { format } from "@/lib/date-format";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { DocumentManager } from "@/components/DocumentManager";

interface Expense {
  id: string;
  vendor: string;
  category: 'labor' | 'materials' | 'equipment' | 'rentals' | 'transportation' | 'other';
  amount: number;
  description: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  project_id?: string;
  project_name?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  approval_notes?: string;
  created_by_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { filters, setFilters } = useFilters();
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [newExpense, setNewExpense] = useState({ vendor: '', category: '', amount: '', description: '', project_id: '' } as any);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [docManagerExpenseId, setDocManagerExpenseId] = useState<string>('');

  // Mock user for approval functionality
  const user = { email: 'admin@siteproc.com' };

  // Check authentication first
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated === true) {
      fetchExpenses();
    }
  }, [authenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setAuthenticated(true);
      } else {
        console.log('Not authenticated, redirecting to login...');
        window.location.href = '/login?redirectTo=' + encodeURIComponent(window.location.pathname);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/login?redirectTo=' + encodeURIComponent(window.location.pathname);
    }
  };

  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const res = await fetch('/api/projects');
      if (res.status === 401) {
        console.log('Unauthorized - redirecting to login');
        window.location.href = '/login?redirectTo=' + encodeURIComponent(window.location.pathname);
        return;
      }
      if (!res.ok) throw new Error(`projects ${res.status}`);
      const json = await res.json();
      const projectsData = json.data || json || [];
      setProjects(projectsData.map((p: any) => ({ id: p.id, name: p.name })));
      if (projectsData.length === 1) {
        setNewExpense(v => ({ ...v, project_id: projectsData[0].id } as any));
      }
    } catch (e) {
      console.error('Failed to load projects', e);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      // Fetch expenses from API
      const response = await fetch('/api/expenses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch expenses: ${response.status}`);
      }

      const json = await response.json();
      const fetchedExpenses: Expense[] = json.data || json.expenses || [];

      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      
      // Fallback to empty state - no mock data
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedTab === 'all' || expense.status === selectedTab;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    // Advanced filters
    const matchesAdvStatus = !filters.status || expense.status === filters.status;
    const matchesAdvCategory = !filters.category || expense.category === filters.category;
    
    // Date range filter
    const matchesDateRange = (!filters.startDate || new Date(expense.created_at) >= new Date(filters.startDate)) &&
                             (!filters.endDate || new Date(expense.created_at) <= new Date(filters.endDate));
    
    // Amount range filter
    const matchesAmountRange = (!filters.minAmount || expense.amount >= Number(filters.minAmount)) &&
                               (!filters.maxAmount || expense.amount <= Number(filters.maxAmount));
    
    return matchesSearch && matchesStatus && matchesCategory && matchesAdvStatus && matchesAdvCategory && matchesDateRange && matchesAmountRange;
  });

  const stats = {
    total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    pending: expenses.filter(e => e.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0),
    approved: expenses.filter(e => e.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0),
    thisMonth: expenses.reduce((sum, exp) => sum + exp.amount, 0) // Mock this month calculation
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      labor: 'bg-blue-50 text-blue-700 border-blue-200',
      materials: 'bg-green-50 text-green-700 border-green-200',
      equipment: 'bg-purple-50 text-purple-700 border-purple-200',
      rentals: 'bg-orange-50 text-orange-700 border-orange-200',
      transportation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      other: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending' },
      approved: { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'Approved' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'Rejected' }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const handleApproval = async () => {
    if (!selectedExpense) return;
    
    try {
      // Update expense status via API
      const response = await fetch(`/api/expenses/${selectedExpense.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalAction === 'approve' ? 'approve' : 'reject',
          notes: approvalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update expense: ${response.status}`);
      }

      const data = await response.json();
      const updated = data.expense || data.data || data;
      
      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === selectedExpense.id ? {
          ...expense,
          ...updated,
          status: approvalAction === 'approve' ? 'approved' : 'rejected',
          approval_notes: approvalNotes || expense.approval_notes,
          approved_at: updated?.approved_at || new Date().toISOString(),
          approved_by: updated?.approved_by || 'You'
        } : expense
      ));
      
      toast.success(`Expense ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      setIsApprovalModalOpen(false);
      setSelectedExpense(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(`Failed to ${approvalAction} expense`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FRONTEND EXPENSE SUBMISSION ===');
    console.log('Form data:', newExpense);
    
    if (!newExpense.vendor || !newExpense.amount || !newExpense.project_id) {
      toast.error('Please fill in all required fields');
      console.error('Missing required fields:', {
        vendor: !!newExpense.vendor,
        amount: !!newExpense.amount,
        project_id: !!newExpense.project_id
      });
      return;
    }

    try {
      const requestBody = {
        vendor: newExpense.vendor,
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        description: newExpense.description,
        project_id: newExpense.project_id
      };
      
      console.log('Sending request with body:', requestBody);
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('Parsed error data:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Success response text:', responseText);
      
      let createdExpense;
      try {
        createdExpense = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid JSON response: ' + responseText);
      }
      
      console.log('Created expense:', createdExpense);
      
      // Add to expenses list
      setExpenses([{
        id: createdExpense.id,
        vendor: createdExpense.vendor,
        category: createdExpense.category,
        amount: createdExpense.amount,
        description: createdExpense.description,
        status: createdExpense.status || 'pending',
        created_at: createdExpense.created_at,
        project_id: newExpense.project_id
      }, ...expenses]);
      
      setIsModalOpen(false);
      setNewExpense({
        vendor: '',
        category: 'materials',
        amount: '',
        description: '',
        project_id: ''
      });
      toast.success('Expense created successfully');
      console.log('=== EXPENSE SUBMISSION COMPLETE ===');
    } catch (error) {
      console.error('=== EXPENSE SUBMISSION FAILED ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Full error object:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create expense';
      toast.error(errorMessage);
    }
  };

  if (authenticated === null) {
    return (
      <AppLayout title="Expenses" description="Manage and track project expenses">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Expenses" description="Manage and track project expenses">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2" />
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
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
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setIsModalOpen(true); loadProjects(); }}>
            Add Expense
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Action Items Banner */}
        {(expenses.filter(e => !e.receipt_url && e.amount > 100).length > 0 || 
          expenses.filter(e => !e.project_id).length > 0 ||
          expenses.filter(e => e.status === 'pending').length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Action Required</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  {expenses.filter(e => e.status === 'pending').length > 0 && (
                    <li>• {expenses.filter(e => e.status === 'pending').length} expense(s) awaiting approval</li>
                  )}
                  {expenses.filter(e => !e.receipt_url && e.amount > 100).length > 0 && (
                    <li>• {expenses.filter(e => !e.receipt_url && e.amount > 100).length} expense(s) over $100 missing receipts</li>
                  )}
                  {expenses.filter(e => !e.project_id).length > 0 && (
                    <li>• {expenses.filter(e => !e.project_id).length} expense(s) not linked to projects</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats.total)}
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />

          <StatCard
            title="Pending Approval"
            value={formatCurrency(stats.pending)}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
          />

          <StatCard
            title="Approved"
            value={formatCurrency(stats.approved)}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />

          <StatCard
            title="This Month"
            value={formatCurrency(stats.thisMonth)}
            icon={Calendar}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by vendor or description..."
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="labor">Labor</option>
                  <option value="materials">Materials</option>
                  <option value="equipment">Equipment</option>
                  <option value="rentals">Rentals</option>
                  <option value="transportation">Transportation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
          
          <FilterPanel
            config={{
              status: [
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
              ],
              category: [
                { label: 'Labor', value: 'labor' },
                { label: 'Materials', value: 'materials' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Rentals', value: 'rentals' },
                { label: 'Transportation', value: 'transportation' },
                { label: 'Other', value: 'other' },
              ],
            }}
            filters={filters}
            onChange={setFilters}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Expenses', count: expenses.length },
                { key: 'pending', label: 'Pending', count: expenses.filter(e => e.status === 'pending').length },
                { key: 'approved', label: 'Approved', count: expenses.filter(e => e.status === 'approved').length },
                { key: 'rejected', label: 'Rejected', count: expenses.filter(e => e.status === 'rejected').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={cn(
                    "py-4 px-2 border-b-2 font-medium text-sm transition-colors",
                    selectedTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Expense List */}
          <div className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500">Try adjusting your filters or add a new expense.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => {
                  const statusConfig = getStatusConfig(expense.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{expense.vendor}</span>
                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", getCategoryColor(expense.category))}>
                              {expense.category}
                            </span>
                            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", statusConfig.color)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusConfig.label}
                            </div>
                            {!expense.receipt_url && expense.amount > 100 && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                                <AlertCircle className="w-3 h-3" />
                                Receipt needed
                              </div>
                            )}
                            {!expense.project_id && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600">
                                <AlertCircle className="w-3 h-3" />
                                No project
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2 break-words">{expense.description}</p>
                          {expense.project_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <Building className="h-4 w-4" />
                              <span>{expense.project_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            {expense.receipt_url && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <Receipt className="h-4 w-4" />
                                <span>Receipt attached</span>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDocManagerExpenseId(expense.id);
                                setDocManagerOpen(true);
                              }}
                              leftIcon={<FileText className="w-4 h-4" />}
                            >
                              Documents
                            </Button>
                          </div>
                          <div className="text-sm text-gray-500 break-words">
                            <div>Created: {format(new Date(expense.created_at), 'MMM dd, yyyy')}</div>
                            {expense.approved_at && (
                              <div>
                                Approved: {format(new Date(expense.approved_at), 'MMM dd, yyyy')} by {" "}
                                <span className="break-all">{expense.approved_by}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="sm:text-right text-left w-full sm:w-auto flex-shrink-0">
                          <div className="text-xl font-bold text-gray-900 whitespace-nowrap sm:whitespace-normal">{formatCurrency(expense.amount)}</div>
                          {expense.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setApprovalAction('approve');
                                  setIsApprovalModalOpen(true);
                                }}
                                leftIcon={<CheckCircle className="w-4 h-4" />}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setApprovalAction('reject');
                                  setIsApprovalModalOpen(true);
                                }}
                                leftIcon={<XCircle className="w-4 h-4" />}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add Expense Modal */}
        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Expense"
          description="Record a new expense and link it to a project for budget tracking"
          icon={<Receipt className="h-5 w-5" />}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm">Basic Information</h4>
              
              <Input
                label="Vendor"
                required
                value={newExpense.vendor}
                onChange={(e) => setNewExpense(v => ({ ...v, vendor: e.target.value }))}
                placeholder="Enter vendor/supplier name"
                fullWidth
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  required
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(v => ({ ...v, category: e.target.value }))}
                  options={[
                    { value: '', label: 'Select category' },
                    { value: 'labor', label: 'Labor' },
                    { value: 'materials', label: 'Materials' },
                    { value: 'equipment', label: 'Equipment' },
                    { value: 'rentals', label: 'Rentals' },
                    { value: 'transportation', label: 'Transportation' },
                    { value: 'other', label: 'Other' }
                  ]}
                />

                <Input
                  label="Amount"
                  type="number"
                  required
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(v => ({ ...v, amount: e.target.value }))}
                  placeholder="0.00"
                  leftIcon={<DollarSign className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Project Link Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm">Project Link</h4>
              
              <Select
                label="Project"
                required
                value={newExpense.project_id}
                onChange={(e) => setNewExpense((v: any) => ({ ...v, project_id: e.target.value }))}
                options={[
                  { value: '', label: projectsLoading ? 'Loading projects...' : 'Select project' },
                  ...projects.map((p) => ({ value: p.id, label: p.name }))
                ]}
                helpText={!newExpense.project_id ? "Linking to a project enables budget tracking" : undefined}
              />
            </div>

            {/* Description Section */}
            <TextArea
              label="Description"
              required
              value={newExpense.description}
              onChange={(e) => setNewExpense(v => ({ ...v, description: e.target.value }))}
              placeholder="Describe the expense, what was purchased, or purpose"
              rows={3}
              fullWidth
            />

            {/* Receipt Reminder */}
            {parseFloat(newExpense.amount) > 100 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Receipt className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Receipt Recommended</p>
                    <p className="text-xs text-blue-700 mt-1">
                      For expenses over $100, please upload a receipt after creating this expense.
                      You can add it from the expense details page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <FormModalActions
              onCancel={() => setIsModalOpen(false)}
              submitLabel="Add Expense"
            />
          </form>
        </FormModal>

        {/* Approval Modal */}
        {isApprovalModalOpen && selectedExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Vendor:</strong> {selectedExpense.vendor}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Description:</strong> {selectedExpense.description}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {approvalAction === 'approve' ? 'Approval' : 'Rejection'} Notes
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={`Add notes for this ${approvalAction}...`}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsApprovalModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant={approvalAction === 'approve' ? 'primary' : 'danger'}
                  onClick={handleApproval}
                  className="flex-1"
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Document Manager Modal */}
        <DocumentManager
          entityType="expense"
          entityId={docManagerExpenseId}
          documentType="receipt"
          isOpen={docManagerOpen}
          onClose={() => {
            setDocManagerOpen(false);
            setDocManagerExpenseId('');
          }}
          title="Expense Receipts"
        />
      </div>
    </AppLayout>
  );
}