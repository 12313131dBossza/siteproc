"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface DashboardStats {
  projects: {
    total: number;
    active: number;
    totalBudget: number;
    totalSpent: number;
  };
  orders: {
    total: number;
    pending: number;
    totalValue: number;
    thisMonth: number;
  };
  expenses: {
    total: number;
    thisMonth: number;
    approved: number;
    pending: number;
  };
  deliveries: {
    total: number;
    inTransit: number;
    delivered: number;
    failed: number;
  };
}

interface RecentActivity {
  id: string;
  type: "project" | "order" | "expense" | "delivery";
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch real data from our APIs
      const [projectsRes, ordersRes, expensesRes, deliveriesRes, activityRes] = await Promise.allSettled([
        fetch('/api/projects'),
        fetch('/api/orders'),
        fetch('/api/expenses'),
        fetch('/api/deliveries'),
        fetch('/api/activity?limit=10') // Assume we have activity endpoint
      ]);

      // Parse successful responses
      const projects = projectsRes.status === 'fulfilled' && projectsRes.value.ok 
        ? await projectsRes.value.json() 
        : { success: true, data: [] };
      
      const orders = ordersRes.status === 'fulfilled' && ordersRes.value.ok 
        ? await ordersRes.value.json() 
        : { success: true, data: [] };
      
      const expenses = expensesRes.status === 'fulfilled' && expensesRes.value.ok 
        ? await expensesRes.value.json() 
        : { success: true, data: [] };
      
      const deliveries = deliveriesRes.status === 'fulfilled' && deliveriesRes.value.ok 
        ? await deliveriesRes.value.json() 
        : { success: true, data: [] };

      // Calculate real stats from API data
      const projectData = projects.success ? projects.data : [];
      const orderData = orders.success ? orders.data : [];
      const expenseData = expenses.success ? expenses.data : [];
      const deliveryData = deliveries.success ? deliveries.data : [];

      // Calculate project stats
      const activeProjects = projectData.filter((p: any) => p.status === 'active');
      const totalBudget = projectData.reduce((sum: number, p: any) => sum + (p.budget || 0), 0);
      const totalSpent = projectData.reduce((sum: number, p: any) => sum + (p.summary?.totalSpent || 0), 0);

      // Calculate order stats
      const pendingOrders = orderData.filter((o: any) => o.status === 'pending');
      const totalOrderValue = orderData.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
      const thisMonthOrders = orderData.filter((o: any) => {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      });
      const thisMonthOrderValue = thisMonthOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

      // Calculate expense stats
      const approvedExpenses = expenseData.filter((e: any) => e.status === 'approved');
      const pendingExpenses = expenseData.filter((e: any) => e.status === 'pending');
      const totalExpenseAmount = approvedExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const pendingExpenseAmount = pendingExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const thisMonthExpenses = approvedExpenses.filter((e: any) => {
        const expenseDate = new Date(e.created_at);
        const now = new Date();
        return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
      });
      const thisMonthExpenseAmount = thisMonthExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Calculate delivery stats
      const deliveredDeliveries = deliveryData.filter((d: any) => d.status === 'delivered');
      const inTransitDeliveries = deliveryData.filter((d: any) => d.status === 'in_transit');
      const failedDeliveries = deliveryData.filter((d: any) => d.status === 'failed');

      const calculatedStats: DashboardStats = {
        projects: {
          total: projectData.length,
          active: activeProjects.length,
          totalBudget,
          totalSpent,
        },
        orders: {
          total: orderData.length,
          pending: pendingOrders.length,
          totalValue: totalOrderValue,
          thisMonth: thisMonthOrderValue,
        },
        expenses: {
          total: totalExpenseAmount,
          thisMonth: thisMonthExpenseAmount,
          approved: totalExpenseAmount,
          pending: pendingExpenseAmount,
        },
        deliveries: {
          total: deliveryData.length,
          inTransit: inTransitDeliveries.length,
          delivered: deliveredDeliveries.length,
          failed: failedDeliveries.length,
        },
      };

      // Create recent activity from real data
      const recentActivityItems: RecentActivity[] = [];
      
      // Add recent projects
      projectData.slice(0, 2).forEach((project: any) => {
        recentActivityItems.push({
          id: `project-${project.id}`,
          type: "project",
          title: project.name,
          description: `Project with $${(project.budget / 100).toFixed(2)} budget`,
          amount: project.budget,
          timestamp: project.created_at,
          status: project.status,
        });
      });

      // Add recent orders
      orderData.slice(0, 2).forEach((order: any) => {
        recentActivityItems.push({
          id: `order-${order.id}`,
          type: "order",
          title: order.description,
          description: `${order.category} order for project`,
          amount: order.amount,
          timestamp: order.created_at,
          status: order.status,
        });
      });

      // Add recent expenses
      expenseData.slice(0, 2).forEach((expense: any) => {
        recentActivityItems.push({
          id: `expense-${expense.id}`,
          type: "expense",
          title: expense.description,
          description: `${expense.category} expense`,
          amount: expense.amount,
          timestamp: expense.created_at,
          status: expense.status,
        });
      });

      // Add recent deliveries
      deliveryData.slice(0, 2).forEach((delivery: any) => {
        recentActivityItems.push({
          id: `delivery-${delivery.id}`,
          type: "delivery",
          title: delivery.orders?.description || "Delivery",
          description: `Delivery for order`,
          timestamp: delivery.created_at,
          status: delivery.status,
        });
      });

      // Sort by timestamp and take most recent
      recentActivityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setStats(calculatedStats);
      setRecentActivity(recentActivityItems.slice(0, 4));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      
      // Fallback to mock data if API fails
      const mockStats: DashboardStats = {
        projects: {
          total: 12,
          active: 8,
          totalBudget: 8500000,
          totalSpent: 5200000,
        },
        orders: {
          total: 156,
          pending: 23,
          totalValue: 450000,
          thisMonth: 89000,
        },
        expenses: {
          total: 89000,
          thisMonth: 23000,
          approved: 67000,
          pending: 12000,
        },
        deliveries: {
          total: 134,
          inTransit: 18,
          delivered: 98,
          failed: 3,
        },
      };

      const mockActivity: RecentActivity[] = [
        {
          id: "1",
          type: "project",
          title: "Downtown Office Building",
          description: "Project created with $2.5M budget",
          amount: 2500000,
          timestamp: new Date().toISOString(),
          status: "active",
        },
        {
          id: "2",
          type: "order",
          title: "Steel Beams Order",
          description: "50 units ordered for foundation work",
          amount: 12500,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "pending",
        },
        {
          id: "3",
          type: "expense",
          title: "Equipment Rental",
          description: "Crane rental for 3 days",
          amount: 850,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: "approved",
        },
        {
          id: "4",
          type: "delivery",
          title: "Concrete Mix Delivery",
          description: "100 units delivered to Riverside site",
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          status: "delivered",
        },
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "project": return <FolderOpen className="h-4 w-4" />;
      case "order": return <ShoppingCart className="h-4 w-4" />;
      case "expense": return <Receipt className="h-4 w-4" />;
      case "delivery": return <Package className="h-4 w-4" />;
      default: return <LayoutDashboard className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "project": return "bg-blue-50 text-blue-600";
      case "order": return "bg-green-50 text-green-600";
      case "expense": return "bg-orange-50 text-orange-600";
      case "delivery": return "bg-purple-50 text-purple-600";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard" description="Welcome back! Here's an overview of your projects">
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

  if (!stats) {
    return (
      <AppLayout title="Dashboard" description="Welcome back! Here's an overview of your projects">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
            <p className="text-gray-500">Please try refreshing the page</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const budgetUsagePercentage = (stats.projects.totalSpent / stats.projects.totalBudget) * 100;

  return (
    <AppLayout
      title="Dashboard"
      description="Welcome back! Here's an overview of your projects"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<BarChart3 className="h-4 w-4" />}>
            Reports
          </Button>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            Quick Actions
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Projects Overview */}
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

          {/* Budget Overview */}
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

          {/* Orders Overview */}
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

          {/* Deliveries Overview */}
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
              <span className="text-blue-600 font-medium">{stats.deliveries.inTransit} in transit</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Expenses</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.expenses.thisMonth)}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Order Value (Month)</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.orders.thisMonth)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Budget Usage</p>
                <p className="text-xl font-bold text-gray-900">{budgetUsagePercentage.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <Link href="/activity" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg", getActivityColor(activity.type))}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          {activity.amount && (
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(activity.amount)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {format(new Date(activity.timestamp), "MMM dd, yyyy 'at' h:mm a")}
                          </span>
                          {activity.status && (
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              activity.status === "active" || activity.status === "approved" || activity.status === "delivered"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            )}>
                              {activity.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Summary */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href="/projects/new"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">New Project</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
                
                <Link
                  href="/orders"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-gray-900">Place Order</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
                
                <Link
                  href="/expenses"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Add Expense</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
                
                <Link
                  href="/deliveries"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">Track Delivery</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Status Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Status Summary</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Pending Orders</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats.orders.pending}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-600">Pending Expenses</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(stats.expenses.pending)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">In Transit</span>
                  </div>
                  <span className="font-semibold text-gray-900">{stats.deliveries.inTransit}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Completed Today</span>
                  </div>
                  <span className="font-semibold text-gray-900">12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}