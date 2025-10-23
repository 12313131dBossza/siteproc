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
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { format } from '@/lib/date-format';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'delivery' | 'expense' | 'change_order' | 'user' | 'order' | 'payment' | 'project' | 'product' | 'other';
  action: string;
  title: string;
  description: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  status?: 'success' | 'pending' | 'failed' | 'warning' | null;
  amount?: number | null;
  metadata?: Record<string, any>;
}

interface ActivityStats {
  total: number;
  total_today: number;
  total_week: number;
  unique_users: number;
  most_active_type: string;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

function useActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    total_today: 0,
    total_week: 0,
    unique_users: 0,
    most_active_type: '',
    by_type: {},
    by_status: {}
  });

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/activity?limit=100');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.ok && result.data) {
        setActivities(result.data);
        setStats(result.stats || {
          total: 0,
          total_today: 0,
          total_week: 0,
          unique_users: 0,
          most_active_type: '',
          by_type: {},
          by_status: {}
        });
      } else {
        throw new Error(result.error || 'Failed to fetch activities');
      }
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.message);
      // Set empty data on error
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return { activities, loading, stats, error, refetch: fetchActivities };
}

// Legacy mock data for fallback (keeping structure for reference)
function useMockActivities_DEPRECATED() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    total_today: 0,
    total_week: 0,
    unique_users: 0,
    most_active_type: '',
    by_type: {},
    by_status: {}
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  return { activities, loading, stats };
}

export default function ActivityLogPage() {
  const { activities, loading, stats, error } = useActivity();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.user_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    
    // Date filtering for tabs
    const now = new Date();
    let matchesTab = true;
    if (selectedTab === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesTab = new Date(activity.created_at) >= today;
    } else if (selectedTab === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesTab = new Date(activity.created_at) >= weekAgo;
    } else if (selectedTab === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesTab = new Date(activity.created_at) >= monthAgo;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const getActivityIcon = (type: string) => {
    const icons = {
      delivery: Package,
      expense: DollarSign,
      change_order: FileEdit,
      'change-order': FileEdit,
      user: User,
      order: BarChart3,
      payment: CheckCircle,
      project: FolderOpen,
      product: Package
    };
    const Icon = icons[type.replace('-', '_') as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getActivityColor = (type: string) => {
    const colors = {
      delivery: 'bg-blue-50 text-blue-600 border-blue-200',
      expense: 'bg-green-50 text-green-600 border-green-200',
      change_order: 'bg-purple-50 text-purple-600 border-purple-200',
      'change-order': 'bg-purple-50 text-purple-600 border-purple-200',
      user: 'bg-orange-50 text-orange-600 border-orange-200',
      order: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      payment: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      project: 'bg-cyan-50 text-cyan-600 border-cyan-200',
      product: 'bg-pink-50 text-pink-600 border-pink-200'
    };
    return colors[type.replace('-', '_') as keyof typeof colors] || 'bg-gray-50 text-gray-600 border-gray-200';
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
                  <option value="change_order">Change Orders</option>
                  <option value="order">Orders</option>
                  <option value="project">Projects</option>
                  <option value="user">Users</option>
                  <option value="payment">Payments</option>
                  <option value="product">Products</option>
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
                                  <span className="text-xs font-semibold text-blue-600">
                                    {getInitials(activity.user_name || 'System')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {activity.user_name || 'System'}
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    {activity.user_email || 'system@siteproc.com'}
                                  </div>
                                </div>
                              </div>
                              
                              {activity.amount && (
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(activity.amount)}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              {format(new Date(activity.created_at), 'MMM dd, yyyy • HH:mm')}
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
                        <span className="text-sm font-semibold text-blue-600">
                          {getInitials(selectedActivity.user_name || 'System')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{selectedActivity.user_name || 'System'}</div>
                        <div className="text-sm text-gray-500">{selectedActivity.user_email || 'system@siteproc.com'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Timestamp</h4>
                    <div className="text-sm text-gray-600">
                      {format(new Date(selectedActivity.created_at), 'EEEE, MMMM dd, yyyy')}
                      <br />
                      {format(new Date(selectedActivity.created_at), 'HH:mm:ss')}
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
