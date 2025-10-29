"use client";

import { useState, useEffect } from "react";
import { PageLoading } from "@/components/ui";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  Package,
  Receipt,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Activity,
  Users
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardData {
  stats: {
    projects: {
      total: number;
      active: number;
      totalBudget: number;
      totalSpent: number;
    };
    orders: {
      total: number;
      pending: number;
      approved: number;
      thisMonth: number;
    };
    deliveries: {
      total: number;
      pending: number;
      delivered: number;
      partial: number;
    };
    payments: {
      total: number;
      paid: number;
      unpaid: number;
      thisMonth: number;
    };
  };
  budgetHealth: {
    overBudget: number;
    critical: number;
    warning: number;
    healthy: number;
  };
  monthlyTrends: Array<{
    month: string;
    expenses: number;
    payments: number;
    orders: number;
    deliveries: number;
  }>;
  topVendors: Array<{
    name: string;
    totalPaid: number;
    paymentCount: number;
    avgPayment: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  budgetVariance: Array<any>;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#A855F7',
  indigo: '#6366F1',
};

const BUDGET_HEALTH_COLORS = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.indigo];

export default function EnhancedDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/reports/dashboard');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setDashboardData(result.data);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading message="Loading dashboard..." />;
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
          <p className="text-gray-500 mb-4">{error || 'Please try refreshing the page'}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, budgetHealth, monthlyTrends, topVendors, expenseBreakdown } = dashboardData;
  const budgetUsagePercentage = stats.projects.totalBudget > 0 
    ? (stats.projects.totalSpent / stats.projects.totalBudget) * 100 
    : 0;

  // Prepare budget health pie chart data
  const budgetHealthData = [
    { name: 'Healthy', value: budgetHealth.healthy },
    { name: 'Warning', value: budgetHealth.warning },
    { name: 'Critical', value: budgetHealth.critical },
    { name: 'Over Budget', value: budgetHealth.overBudget },
  ].filter(item => item.value > 0);

  // Prepare expense breakdown for pie chart (top 5)
  const topExpenseCategories = expenseBreakdown.slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI Cards Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Projects Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.projects.total}</h3>
          <p className="text-sm text-gray-500 mb-3">Total Projects</p>
          <div className="text-xs text-gray-600">
            <span className="text-green-600 font-medium">{stats.projects.active} active</span>
          </div>
        </div>

        {/* Budget Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">
              {budgetUsagePercentage.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {formatCurrency(stats.projects.totalBudget)}
          </h3>
          <p className="text-sm text-gray-500 mb-3">Total Budget</p>
          <div className="text-xs text-gray-600">
            <span className="text-orange-600 font-medium">
              {formatCurrency(stats.projects.totalSpent)} spent
            </span>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.orders.total}</h3>
          <p className="text-sm text-gray-500 mb-3">Total Orders</p>
          <div className="text-xs text-gray-600">
            <span className="text-yellow-600 font-medium">{stats.orders.pending} pending</span>
          </div>
        </div>

        {/* Deliveries Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.deliveries.total}</h3>
          <p className="text-sm text-gray-500 mb-3">Total Deliveries</p>
          <div className="text-xs text-gray-600">
            <span className="text-green-600 font-medium">{stats.deliveries.delivered} delivered</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Financial Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Financial Trends</h3>
              <p className="text-sm text-gray-500">Last 6 months</p>
            </div>
            <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Details
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke={COLORS.danger} 
                strokeWidth={2}
                name="Expenses"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="payments" 
                stroke={COLORS.success} 
                strokeWidth={2}
                name="Payments"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Health Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Project Budget Health</h3>
              <p className="text-sm text-gray-500">Distribution by status</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={budgetHealthData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {budgetHealthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BUDGET_HEALTH_COLORS[index % BUDGET_HEALTH_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Vendors & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Vendors</h3>
              <p className="text-sm text-gray-500">By total paid</p>
            </div>
            <Link href="/payments" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topVendors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="totalPaid" fill={COLORS.indigo} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
              <p className="text-sm text-gray-500">By category</p>
            </div>
            <Link href="/expenses" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topExpenseCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.category}: $${(Number(entry.amount) / 1000).toFixed(0)}k`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
              >
                {topExpenseCategories.map((entry, index) => {
                  const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.payments.unpaid)}</p>
            </div>
            <Receipt className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Orders This Month</p>
              <p className="text-xl font-bold text-gray-900">{stats.orders.thisMonth}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Deliveries</p>
              <p className="text-xl font-bold text-gray-900">{stats.deliveries.pending}</p>
            </div>
            <Package className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Budget Remaining</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(stats.projects.totalBudget - stats.projects.totalSpent)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FolderOpen className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Projects</span>
          </Link>
          
          <Link
            href="/orders"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ShoppingCart className="h-5 w-5 text-green-600" />
            <span className="font-medium text-gray-900">Orders</span>
          </Link>
          
          <Link
            href="/expenses"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Receipt className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-gray-900">Expenses</span>
          </Link>
          
          <Link
            href="/deliveries"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Package className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-gray-900">Deliveries</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
