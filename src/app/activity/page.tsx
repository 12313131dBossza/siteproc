"use client";

import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import {
  Activity,
  Package,
  DollarSign,
  FileEdit,
  User,
  Filter,
  Download,
  Search,
  Calendar,
  Clock,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'delivery' | 'expense' | 'change-order' | 'user' | 'order' | 'payment';
  action: string;
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  status?: 'success' | 'pending' | 'failed' | 'warning';
  amount?: number;
  metadata?: Record<string, any>;
}

interface ActivityStats {
  total_today: number;
  total_week: number;
  unique_users: number;
  most_active_type: string;
}

function useActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats>({
    total_today: 0,
    total_week: 0,
    unique_users: 0,
    most_active_type: ''
  });

  useEffect(() => {
    setTimeout(() => {
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'delivery',
          action: 'created',
          title: 'Delivery #D-102 Created',
          description: '8 pallets of cement scheduled for delivery',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          user: { name: 'Alex Chen', email: 'alex@company.com' },
          status: 'success',
          metadata: { delivery_id: 'D-102', items: 8 }
        },
        {
          id: '2',
          type: 'expense',
          action: 'approved',
          title: 'Equipment Rental Expense Approved',
          description: 'Excavator rental expense for foundation work',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          user: { name: 'Marie Kumar', email: 'marie@company.com' },
          status: 'success',
          amount: 1240,
          metadata: { expense_id: 'EXP-045', category: 'equipment' }
        },
        {
          id: '3',
          type: 'change-order',
          action: 'submitted',
          title: 'Change Order #CO-018 Submitted',
          description: 'Foundation rebar upgrade requested for Project Alpha',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          user: { name: 'John Doe', email: 'john@company.com' },
          status: 'pending',
          amount: 3500,
          metadata: { change_order_id: 'CO-018', project: 'Project Alpha' }
        },
        {
          id: '4',
          type: 'user',
          action: 'invited',
          title: 'New Team Member Invited',
          description: 'Admin access granted to new project coordinator',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          user: { name: 'System', email: 'system@siteproc.com' },
          status: 'success',
          metadata: { invited_email: 'coordinator@company.com', role: 'admin' }
        },
        {
          id: '5',
          type: 'order',
          action: 'completed',
          title: 'Purchase Order #PO-234 Completed',
          description: '20 steel beams delivered and verified',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          user: { name: 'Bob Wilson', email: 'bob@company.com' },
          status: 'success',
          amount: 15000,
          metadata: { order_id: 'PO-234', items: 20 }
        },
        {
          id: '6',
          type: 'expense',
          action: 'rejected',
          title: 'Transportation Expense Rejected',
          description: 'Fuel expense rejected - exceeds monthly budget',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
          user: { name: 'Alice Brown', email: 'alice@company.com' },
          status: 'failed',
          amount: 850,
          metadata: { expense_id: 'EXP-043', reason: 'Budget exceeded' }
        },
        {
          id: '7',
          type: 'payment',
          action: 'processed',
          title: 'Supplier Payment Processed',
          description: 'Payment to Steel Suppliers Co. completed',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          user: { name: 'Jane Smith', email: 'jane@company.com' },
          status: 'success',
          amount: 25000,
          metadata: { payment_id: 'PAY-156', supplier: 'Steel Suppliers Co.' }
        },
        {
          id: '8',
          type: 'delivery',
          action: 'failed',
          title: 'Delivery #D-100 Failed',
          description: 'Lumber shipment rejected due to quality issues',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          user: { name: 'Mike Johnson', email: 'mike@company.com' },
          status: 'failed',
          metadata: { delivery_id: 'D-100', reason: 'Quality issues' }
        }
      ];
      
      setActivities(mockActivities);
      
      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const todayActivities = mockActivities.filter(a => new Date(a.timestamp) >= today);
      const weekActivities = mockActivities.filter(a => new Date(a.timestamp) >= weekAgo);
      const uniqueUsers = new Set(mockActivities.map(a => a.user.email)).size;
      
      const typeCounts = mockActivities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostActiveType = Object.entries(typeCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || '';
      
      setStats({
        total_today: todayActivities.length,
        total_week: weekActivities.length,
        unique_users: uniqueUsers,
        most_active_type: mostActiveType
      });
      
      setLoading(false);
    }, 500);
  }, []);

  return { activities, loading, stats };
}

export default function ActivityPage() {
  const { activities, loading, stats } = useActivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    
    // Date filtering for tabs
    const now = new Date();
    let matchesTab = true;
    if (selectedTab === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesTab = new Date(activity.timestamp) >= today;
    } else if (selectedTab === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesTab = new Date(activity.timestamp) >= weekAgo;
    } else if (selectedTab === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesTab = new Date(activity.timestamp) >= monthAgo;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const getActivityIcon = (type: string) => {
    const icons = {
      delivery: Package,
      expense: DollarSign,
      'change-order': FileEdit,
      user: User,
      order: BarChart3,
      payment: CheckCircle
    };
    const Icon = icons[type as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      delivery: 'bg-blue-50 text-blue-600 border-blue-200',
      expense: 'bg-green-50 text-green-600 border-green-200',
      'change-order': 'bg-purple-50 text-purple-600 border-purple-200',
      user: 'bg-orange-50 text-orange-600 border-orange-200',
      order: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      payment: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getStatusIcon = (status?: string) => {
    const icons = {
      success: CheckCircle,
      pending: Clock,
      failed: XCircle,
      warning: AlertCircle
    };
    const Icon = icons[status as keyof typeof icons] || CheckCircle;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (status?: string) => {
    const colors = {
      success: 'text-green-600',
      pending: 'text-yellow-600',
      failed: 'text-red-600',
      warning: 'text-orange-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <AppLayout title="Activity Log" description="Track all system activities and changes">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      title="Activity Log"
      description="Track all system activities and changes"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button variant="ghost" leftIcon={<Calendar className="h-4 w-4" />}>
            Date Range
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total_today}</h3>
            <p className="text-sm text-gray-500">Activities Today</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">{stats.total_week}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total_week}</h3>
            <p className="text-sm text-gray-500">This Week</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-600">{stats.unique_users}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.unique_users}</h3>
            <p className="text-sm text-gray-500">Active Users</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-orange-600">Most Active</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1 capitalize">{stats.most_active_type}</h3>
            <p className="text-sm text-gray-500">Top Activity Type</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search activities, users, or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="delivery">Deliveries</option>
                  <option value="expense">Expenses</option>
                  <option value="change-order">Change Orders</option>
                  <option value="order">Orders</option>
                  <option value="user">Users</option>
                  <option value="payment">Payments</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Activity', count: activities.length },
                { key: 'today', label: 'Today', count: stats.total_today },
                { key: 'week', label: 'This Week', count: stats.total_week },
                { key: 'month', label: 'This Month', count: activities.length }
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

          {/* Activity List */}
          <div className="p-6">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later for new activities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  return (
                    <div key={activity.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-lg border", getActivityColor(activity.type))}>
                          {getActivityIcon(activity.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                              <p className="text-sm text-gray-600">{activity.description}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {activity.status && (
                                <div className={cn("flex items-center gap-1", getStatusColor(activity.status))}>
                                  {getStatusIcon(activity.status)}
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedActivity(activity);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-semibold text-blue-600">{getInitials(activity.user.name)}</span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{activity.user.name}</span>
                                  <div className="text-xs text-gray-500">{activity.user.email}</div>
                                </div>
                              </div>
                              
                              {activity.amount && (
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(activity.amount)}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              {format(new Date(activity.timestamp), 'MMM dd, yyyy • HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Activity Details Modal */}
        {isDetailsModalOpen && selectedActivity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedActivity.title}</h3>
                  <p className="text-gray-600">{selectedActivity.description}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Activity Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", getActivityColor(selectedActivity.type))}>
                          {getActivityIcon(selectedActivity.type)}
                          <span className="capitalize">{selectedActivity.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Action:</span>
                        <span className="font-medium capitalize">{selectedActivity.action}</span>
                      </div>
                      {selectedActivity.status && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <div className={cn("flex items-center gap-1", getStatusColor(selectedActivity.status))}>
                            {getStatusIcon(selectedActivity.status)}
                            <span className="capitalize text-sm font-medium">{selectedActivity.status}</span>
                          </div>
                        </div>
                      )}
                      {selectedActivity.amount && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Amount:</span>
                          <span className="font-medium">{formatCurrency(selectedActivity.amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">User Information</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{getInitials(selectedActivity.user.name)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{selectedActivity.user.name}</div>
                        <div className="text-sm text-gray-500">{selectedActivity.user.email}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Timestamp</h4>
                    <div className="text-sm text-gray-600">
                      {format(new Date(selectedActivity.timestamp), 'EEEE, MMMM dd, yyyy')}
                      <br />
                      {format(new Date(selectedActivity.timestamp), 'HH:mm:ss')}
                    </div>
                  </div>

                  {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedActivity.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="text-sm font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  variant="primary"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}