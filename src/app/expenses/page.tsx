"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  amount: number;
  description?: string;
  memo?: string;
  category?: string;
  date?: string;
  status?: "pending" | "approved" | "rejected";
  project_id?: string;
  project_name?: string;
  receipt_url?: string;
  created_at: string;
}

const tabs = [
  { id: "all", label: "All Expenses", icon: Receipt },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "approved", label: "Approved", icon: CheckCircle },
  { id: "rejected", label: "Rejected", icon: XCircle },
];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    description: '',
    memo: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockExpenses: Expense[] = [
        {
          id: "1",
          amount: 2450.00,
          description: "Construction Materials",
          memo: "Concrete and steel for foundation",
          category: "Materials",
          date: new Date().toISOString(),
          status: "approved",
          project_id: "1",
          project_name: "Downtown Office Building",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          amount: 850.50,
          description: "Equipment Rental",
          memo: "Crane rental for 3 days",
          category: "Equipment",
          date: new Date(Date.now() - 86400000).toISOString(),
          status: "pending",
          project_id: "2",
          project_name: "Riverside Apartments",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "3",
          amount: 1200.00,
          description: "Labor Costs",
          memo: "Overtime for weekend work",
          category: "Labor",
          date: new Date(Date.now() - 172800000).toISOString(),
          status: "approved",
          project_id: "1",
          project_name: "Downtown Office Building",
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: "4",
          amount: 350.75,
          description: "Office Supplies",
          memo: "Paper, pens, and office materials",
          category: "Administrative",
          date: new Date(Date.now() - 259200000).toISOString(),
          status: "rejected",
          project_id: "3",
          project_name: "Municipal Library",
          created_at: new Date(Date.now() - 259200000).toISOString(),
        },
      ];
      
      setExpenses(mockExpenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async () => {
    try {
      // Mock creation - replace with actual API call
      const newExpense: Expense = {
        id: Date.now().toString(),
        ...form,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      setModal(false);
      setForm({
        amount: 0,
        description: '',
        memo: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Failed to create expense:", error);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (activeTab !== "all" && expense.status !== activeTab) return false;
    if (searchTerm && !expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !expense.memo?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = expenses.filter(e => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.created_at);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppLayout
      title="Expenses"
      description="Track and manage project expenses"
      actions={
        <Button 
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setModal(true)}
        >
          Add Expense
        </Button>
      }
    >
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-gray-500">All Expenses</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(approvedExpenses)}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingExpenses)}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(thisMonthExpenses)}</p>
            <p className="text-sm text-gray-500">Current Period</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses by description or memo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" leftIcon={<Filter className="h-4 w-4" />}>
                  Filter
                </Button>
                <Button variant="ghost" leftIcon={<Calendar className="h-4 w-4" />}>
                  Date Range
                </Button>
                <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const count = tab.id === "all" 
                  ? expenses.length 
                  : expenses.filter(e => e.status === tab.id).length;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 border border-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    <span className={cn(
                      "ml-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      activeTab === tab.id
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expenses List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  Loading expenses...
                </div>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "Try adjusting your search criteria" : "Start tracking expenses for your projects"}
                </p>
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModal(true)}>
                  Add First Expense
                </Button>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "p-3 rounded-lg",
                        expense.status === "approved" ? "bg-green-50" :
                        expense.status === "pending" ? "bg-yellow-50" :
                        expense.status === "rejected" ? "bg-red-50" :
                        "bg-gray-50"
                      )}>
                        {getStatusIcon(expense.status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {expense.description || "Untitled Expense"}
                          </h3>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium border",
                            getStatusColor(expense.status)
                          )}>
                            {expense.status?.toUpperCase() || "PENDING"}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {expense.memo && (
                            <span>{expense.memo}</span>
                          )}
                          {expense.category && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {expense.category}
                            </span>
                          )}
                          {expense.project_name && (
                            <span>• {expense.project_name}</span>
                          )}
                          {expense.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(expense.date), "MMM dd, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Expense Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Add New Expense</h2>
                <button 
                  onClick={() => setModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input 
                    type="number" 
                    min={0} 
                    step="0.01"
                    value={form.amount} 
                    onChange={e => setForm(f => ({...f, amount: Number(e.target.value)}))} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input 
                    value={form.description} 
                    onChange={e => setForm(f => ({...f, description: e.target.value}))} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter expense description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
                  <textarea 
                    value={form.memo} 
                    onChange={e => setForm(f => ({...f, memo: e.target.value}))} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      value={form.category} 
                      onChange={e => setForm(f => ({...f, category: e.target.value}))} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="Materials">Materials</option>
                      <option value="Labor">Labor</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Travel">Travel</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date"
                      value={form.date} 
                      onChange={e => setForm(f => ({...f, date: e.target.value}))} 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={createExpense}>
                  Add Expense
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}