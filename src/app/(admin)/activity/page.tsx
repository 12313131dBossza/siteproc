"use client";
import { useState, useEffect } from 'react';
import { Activity, Package, DollarSign, FileEdit, User, Filter } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'delivery' | 'expense' | 'change-order' | 'user';
  title: string;
  meta: string;
  timestamp: string;
  user: string;
}

function useActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setActivities([
        { id: '1', type: 'delivery', title: 'Delivery #D-102 received', meta: '8 pallets of cement — by Alex Chen', timestamp: '2h ago', user: 'Alex Chen' },
        { id: '2', type: 'expense', title: 'Expense approved', meta: '$1,240 • rental excavator — by Marie K.', timestamp: 'Yesterday', user: 'Marie K.' },
        { id: '3', type: 'change-order', title: 'Change order drafted', meta: 'Foundation rebar upgrade • Project A', timestamp: '2d ago', user: 'John Doe' },
        { id: '4', type: 'user', title: 'User invited', meta: 'new.user@company.com • Admin role', timestamp: '3d ago', user: 'System' },
        { id: '5', type: 'delivery', title: 'Delivery #D-101 created', meta: '20 steel beams • scheduled for today', timestamp: '3d ago', user: 'Bob Wilson' },
        { id: '6', type: 'expense', title: 'Expense submitted', meta: '$850 • concrete mixer rental', timestamp: '4d ago', user: 'Alice Brown' },
        { id: '7', type: 'change-order', title: 'Change order approved', meta: 'Electrical upgrade • $3,500', timestamp: '5d ago', user: 'Jane Smith' },
        { id: '8', type: 'delivery', title: 'Delivery #D-100 rejected', meta: 'Quality issues with lumber shipment', timestamp: '1w ago', user: 'Mike Johnson' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { activities, loading };
}

export default function ActivityPage() {
  const { activities, loading } = useActivity();
  const [entityFilter, setEntityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredActivities = activities.filter(activity => 
    !entityFilter || activity.type === entityFilter
  );

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, startIndex + itemsPerPage);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Package className="h-4 w-4" />;
      case 'expense': return <DollarSign className="h-4 w-4" />;
      case 'change-order': return <FileEdit className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'delivery': return 'bg-blue-100 text-blue-600';
      case 'expense': return 'bg-green-100 text-green-600';
      case 'change-order': return 'bg-purple-100 text-purple-600';
      case 'user': return 'bg-orange-100 text-orange-600';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 bg-white">
              <div className="h-8 w-8 bg-zinc-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 rounded animate-pulse" />
                <div className="h-3 bg-zinc-200 rounded animate-pulse w-2/3" />
              </div>
              <div className="h-3 bg-zinc-200 rounded animate-pulse w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-1">Track all system activities and changes</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium">Filter by entity:</span>
          </div>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All activities</option>
            <option value="delivery">Deliveries</option>
            <option value="expense">Expenses</option>
            <option value="change-order">Change orders</option>
            <option value="user">Users</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-200">
            {paginatedActivities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-3 hover:bg-zinc-50">
                <div className={`h-8 w-8 rounded-xl grid place-items-center ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900">{activity.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{activity.meta}</div>
                </div>
                <div className="text-xs text-zinc-500 text-right">
                  <div>{activity.timestamp}</div>
                  <div className="mt-1">by {activity.user}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between">
              <div className="text-sm text-zinc-500">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredActivities.length)} of {filteredActivities.length} activities
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 text-sm rounded-lg ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'border border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8 text-center">
          <Activity className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 mb-2">No activity found</h3>
          <p className="text-zinc-500">
            {entityFilter 
              ? `No ${entityFilter.replace('-', ' ')} activities found.`
              : 'Activities will appear here as team members take actions.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
