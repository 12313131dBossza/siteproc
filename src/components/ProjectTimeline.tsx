'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'order' | 'delivery' | 'document' | 'milestone' | 'change_order';
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'delayed';
  date: string;
  metadata?: Record<string, any>;
}

interface ProjectTimelineProps {
  projectId: string;
  projectStatus?: string;
  projectStartDate?: string;
  projectEndDate?: string;
}

export default function ProjectTimeline({ 
  projectId,
  projectStatus,
  projectStartDate,
  projectEndDate
}: ProjectTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchTimelineData();
  }, [projectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders, deliveries, and documents for this project
      const [ordersRes, deliveriesRes] = await Promise.all([
        fetch(`/api/orders?project_id=${projectId}`),
        fetch(`/api/deliveries?project_id=${projectId}`)
      ]);

      const allEvents: TimelineEvent[] = [];

      // Add project start
      if (projectStartDate) {
        allEvents.push({
          id: 'project-start',
          type: 'milestone',
          title: 'Project Started',
          status: 'completed',
          date: projectStartDate,
        });
      }

      // Process orders
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        (ordersData.orders || []).forEach((order: any) => {
          allEvents.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Order ${order.po_number || order.id.slice(0, 8)}`,
            description: `${order.vendor || 'Unknown vendor'} - $${(order.total_amount || 0).toLocaleString()}`,
            status: order.status === 'received' || order.status === 'complete' 
              ? 'completed' 
              : order.status === 'in_transit' 
                ? 'in_progress' 
                : 'pending',
            date: order.created_at,
            metadata: order,
          });
        });
      }

      // Process deliveries
      if (deliveriesRes.ok) {
        const deliveriesData = await deliveriesRes.json();
        (deliveriesData.deliveries || []).forEach((delivery: any) => {
          allEvents.push({
            id: `delivery-${delivery.id}`,
            type: 'delivery',
            title: `Delivery ${delivery.delivery_date ? `on ${new Date(delivery.delivery_date).toLocaleDateString()}` : ''}`,
            description: `${delivery.items?.length || 0} items - ${delivery.status || 'pending'}`,
            status: delivery.status === 'delivered' 
              ? 'completed' 
              : delivery.status === 'in_transit' 
                ? 'in_progress' 
                : 'pending',
            date: delivery.delivery_date || delivery.created_at,
            metadata: delivery,
          });
        });
      }

      // Add project end/target if exists
      if (projectEndDate) {
        const isCompleted = projectStatus === 'completed' || projectStatus === 'closed';
        const isPast = new Date(projectEndDate) < new Date();
        
        allEvents.push({
          id: 'project-end',
          type: 'milestone',
          title: isCompleted ? 'Project Completed' : 'Target Completion',
          status: isCompleted ? 'completed' : isPast ? 'delayed' : 'pending',
          date: projectEndDate,
        });
      }

      // Sort by date
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'order':
        return ShoppingCart;
      case 'delivery':
        return Package;
      case 'document':
        return FileText;
      case 'milestone':
        return Calendar;
      default:
        return Circle;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'delayed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'in_progress':
        return 'border-blue-500 bg-blue-50';
      case 'delayed':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate progress
  const completedCount = events.filter(e => e.status === 'completed').length;
  const progressPercent = events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Project Timeline</h3>
              <p className="text-sm text-gray-500">
                {completedCount} of {events.length} milestones completed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{progressPercent}%</span>
            </div>
            
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {expanded && (
        <div className="p-4">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No timeline events yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {events.map((event, index) => {
                  const EventIcon = getEventIcon(event.type);
                  
                  return (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Status indicator */}
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <EventIcon className="w-4 h-4 text-gray-400" />
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(event.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
