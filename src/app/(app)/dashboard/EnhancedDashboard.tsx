"use client";

import { useState, useEffect } from "react";
import { PageLoading } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
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
  const [rawResponse, setRawResponse] = useState<any>(null); // Debug

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/reports/dashboard');
      const result = await response.json();

      console.log('Dashboard API Response:', result);
      setRawResponse(result); // Store for debug

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      console.log('Dashboard Data:', result.data);
      console.log('Stats:', result.data?.stats);
      
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
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
    { name: 'Healthy', value: budgetHealth?.healthy || 0 },
    { name: 'Warning', value: budgetHealth?.warning || 0 },
    { name: 'Critical', value: budgetHealth?.critical || 0 },
    { name: 'Over Budget', value: budgetHealth?.overBudget || 0 },
  ].filter(item => item.value > 0);

  // Prepare expense breakdown for pie chart (top 5)
  const topExpenseCategories = (expenseBreakdown || []).slice(0, 5);
  
  // Check if we have monthly data
  const hasMonthlyData = monthlyTrends && monthlyTrends.length > 0;
  const hasTopVendors = topVendors && topVendors.length > 0;
  const hasExpenseCategories = topExpenseCategories.length > 0;

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* KPI Cards Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {/* Projects Card */}
        <StatCard
          title="Total Projects"
          value={stats.projects.total.toString()}
          icon={FolderOpen}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          subtitle={`${stats.projects.active} active`}
        />

        {/* Budget Card */}
        <StatCard
          title="Total Budget"
          value={formatCurrency(stats.projects.totalBudget)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
          badge={`${budgetUsagePercentage.toFixed(0)}%`}
          badgeColor="text-green-600"
          subtitle={`${formatCurrency(stats.projects.totalSpent)} spent`}
        />

        {/* Orders Card */}
        <StatCard
          title="Total Orders"
          value={stats.orders.total.toString()}
          icon={ShoppingCart}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50"
          subtitle={`${stats.orders.pending} pending`}
        />

        {/* Deliveries Card */}
        <StatCard
          title="Total Deliveries"
          value={stats.deliveries.total.toString()}
          icon={Package}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-50"
          subtitle={`${stats.deliveries.delivered} delivered`}
        />
      </div>

      {/* Charts Row 1: Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Financial Trend */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Monthly Financial Trends</h3>
              <p className="text-xs sm:text-sm text-gray-500">Last 6 months</p>
            </div>
            <Link href="/reports" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Details
            </Link>
          </div>
          {hasMonthlyData ? (
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
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No financial data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Budget Health Distribution */}
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Project Budget Health</h3>
              <p className="text-xs sm:text-sm text-gray-500">Distribution by status</p>
            </div>
          </div>
          {budgetHealthData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={budgetHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {budgetHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BUDGET_HEALTH_COLORS[index % BUDGET_HEALTH_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value} projects`} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap lg:flex-col gap-2 justify-center">
                {budgetHealthData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: BUDGET_HEALTH_COLORS[index % BUDGET_HEALTH_COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No project data yet</p>
              </div>
            </div>
          )}
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
          {hasTopVendors ? (
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
                  labelFormatter={(label) => `Vendor: ${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="totalPaid" fill={COLORS.indigo} radius={[0, 8, 8, 0]} name="Total Paid" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No vendor payments yet</p>
                <p className="text-xs mt-1">Vendor data will appear after recording payments</p>
              </div>
            </div>
          )}
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
          {hasExpenseCategories ? (
            <div className="flex flex-col lg:flex-row items-center gap-4 overflow-hidden">
              <div className="flex-shrink-0 w-full lg:w-auto">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={topExpenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="amount"
                      paddingAngle={2}
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
              {/* Legend */}
              <div className="flex flex-wrap lg:flex-col gap-2 justify-center min-w-0 max-w-full lg:max-w-[160px] overflow-hidden">
                {topExpenseCategories.map((entry: any, index) => {
                  const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple];
                  return (
                    <div key={entry.category} className="flex items-center gap-2 min-w-0 max-w-full">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <span className="text-sm text-gray-600 truncate" title={`${entry.category}: ${formatCurrency(entry.amount)}`}>
                        {entry.category}: {formatCurrency(entry.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No expenses recorded yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Payments"
          value={formatCurrency(stats.payments.unpaid)}
          icon={Receipt}
          iconColor="text-orange-400"
          iconBgColor="bg-orange-50"
        />

        <StatCard
          title="Orders This Month"
          value={stats.orders.thisMonth.toString()}
          icon={ShoppingCart}
          iconColor="text-purple-400"
          iconBgColor="bg-purple-50"
        />

        <StatCard
          title="Pending Deliveries"
          value={stats.deliveries.pending.toString()}
          icon={Package}
          iconColor="text-blue-400"
          iconBgColor="bg-blue-50"
        />

        <StatCard
          title="Budget Remaining"
          value={formatCurrency(stats.projects.totalBudget - stats.projects.totalSpent)}
          icon={DollarSign}
          iconColor="text-green-400"
          iconBgColor="bg-green-50"
        />
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
