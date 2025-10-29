"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/StatCard";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Edit,
  MapPin,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { format } from "@/lib/date-format";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface DeliveryItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Delivery {
  id: string;
  order_id: string;
  delivery_date: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  driver_name?: string;
  vehicle_number?: string;
  notes?: string;
  total_amount: number;
  items: DeliveryItem[];
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  tracking_number?: string;
}

interface DeliveryStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  totalValue: number;
}

interface TabConfig {
  id: string;
  label: string;
  count?: number;
  filter?: (delivery: Delivery) => boolean;
}

export default function OrderDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showRecordForm, setShowRecordForm] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - replace with actual API call
      const mockDeliveries: Delivery[] = [
        {
          id: "del_1",
          order_id: "ord_1",
          delivery_date: new Date().toISOString(),
          status: "in_transit",
          driver_name: "John Doe",
          vehicle_number: "TRK-001",
          notes: "Delivery scheduled for morning",
          total_amount: 12500,
          delivery_address: "123 Construction Site, Downtown",
          tracking_number: "TRK001234",
          items: [
            {
              id: "item_1",
              product_name: "Steel Beams",
              quantity: 50,
              unit: "piece",
              unit_price: 250,
              total_price: 12500
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "del_2",
          order_id: "ord_2",
          delivery_date: new Date(Date.now() - 86400000).toISOString(),
          status: "delivered",
          driver_name: "Sarah Smith",
          vehicle_number: "TRK-002",
          notes: "Delivered successfully, signed by site manager",
          total_amount: 4500,
          delivery_address: "456 Building Site, Uptown",
          tracking_number: "TRK001235",
          items: [
            {
              id: "item_2",
              product_name: "Concrete Mix",
              quantity: 100,
              unit: "bag",
              unit_price: 45,
              total_price: 4500
            }
          ],
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: "del_3",
          order_id: "ord_3",
          delivery_date: new Date(Date.now() + 86400000).toISOString(),
          status: "pending",
          total_amount: 3750,
          delivery_address: "789 Project Site, Midtown",
          items: [
            {
              id: "item_3",
              product_name: "Power Tools",
              quantity: 25,
              unit: "piece",
              unit_price: 150,
              total_price: 3750
            }
          ],
          created_at: new Date(Date.now() - 259200000).toISOString(),
          updated_at: new Date(Date.now() - 259200000).toISOString()
        }
      ];

      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): DeliveryStats => {
    const total = deliveries.length;
    const pending = deliveries.filter(d => d.status === 'pending').length;
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const cancelled = deliveries.filter(d => d.status === 'cancelled').length;
    const totalValue = deliveries.reduce((sum, delivery) => sum + delivery.total_amount, 0);

    return { total, pending, inTransit, delivered, cancelled, totalValue };
  };

  const stats = calculateStats();

  const tabs: TabConfig[] = [
    {
      id: "all",
      label: "All Deliveries",
      count: deliveries.length,
    },
    {
      id: "pending",
      label: "Pending",
      count: deliveries.filter(d => d.status === 'pending').length,
      filter: (delivery) => delivery.status === 'pending',
    },
    {
      id: "in_transit",
      label: "In Transit",
      count: deliveries.filter(d => d.status === 'in_transit').length,
      filter: (delivery) => delivery.status === 'in_transit',
    },
    {
      id: "delivered",
      label: "Delivered",
      count: deliveries.filter(d => d.status === 'delivered').length,
      filter: (delivery) => delivery.status === 'delivered',
    },
  ];

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesTab = activeTab === "all" || !tabs.find(tab => tab.id === activeTab)?.filter || 
                     tabs.find(tab => tab.id === activeTab)?.filter?.(delivery);
    const matchesSearch = !searchQuery || 
                         delivery.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.items.some(item => 
                           item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    return matchesTab && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_transit': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <AppLayout title="Order Deliveries" description="Track and manage delivery status">
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
      title="Order Deliveries"
      description="Track and manage delivery status"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowRecordForm(true)}
          >
            Record Delivery
          </Button>
        </div>
      }
    >
      <div className="p-6">
        {/* Stats Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Deliveries"
            value={stats.total.toString()}
            icon={Package}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />

          <StatCard
            title="In Transit"
            value={stats.inTransit.toString()}
            icon={Truck}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />

          <StatCard
            title="Delivered"
            value={stats.delivered.toString()}
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />

          <StatCard
            title="Total Value"
            value={formatCurrency(stats.totalValue)}
            icon={DollarSign}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
            badge={`${((stats.delivered / stats.total) * 100).toFixed(0)}%`}
            badgeColor="text-purple-600"
          />
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

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search deliveries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Deliveries List */}
          <div className="divide-y divide-gray-200">
            {filteredDeliveries.length === 0 ? (
              <div className="p-12 text-center">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Start by recording your first delivery"}
                </p>
                <Button 
                  variant="primary" 
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowRecordForm(true)}
                >
                  Record Delivery
                </Button>
              </div>
            ) : (
              filteredDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">Order #{delivery.order_id}</h4>
                          {delivery.tracking_number && (
                            <span className="text-sm text-blue-600">Tracking: {delivery.tracking_number}</span>
                          )}
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(delivery.status)
                          )}>
                            {getStatusIcon(delivery.status)}
                            <span className="ml-1 capitalize">{delivery.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        
                        <div className="space-y-1 mb-2">
                          {delivery.items.map((item) => (
                            <p key={item.id} className="text-sm text-gray-600">
                              {item.product_name} - {item.quantity} {item.unit}
                            </p>
                          ))}
                        </div>

                        {delivery.delivery_address && (
                          <div className="flex items-center gap-1 mb-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{delivery.delivery_address}</span>
                          </div>
                        )}

                        {delivery.driver_name && (
                          <p className="text-sm text-gray-500 mb-1">
                            Driver: {delivery.driver_name}
                            {delivery.vehicle_number && ` • Vehicle: ${delivery.vehicle_number}`}
                          </p>
                        )}

                        {delivery.notes && (
                          <p className="text-sm text-gray-500 mb-2">{delivery.notes}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Delivery: {format(new Date(delivery.delivery_date), "MMM dd, yyyy")}
                          </span>
                          <span>
                            Created: {format(new Date(delivery.created_at), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(delivery.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {delivery.items.length} item{delivery.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="h-4 w-4" />}
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                        </Button>
                        {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit className="h-4 w-4" />}
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setShowRecordForm(true);
                            }}
                          >
                          </Button>
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

      {/* Record Delivery Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDelivery ? 'Update Delivery' : 'Record New Delivery'}
              </h3>
              <button
                onClick={() => {
                  setShowRecordForm(false);
                  setSelectedDelivery(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Delivery recording form would go here</p>
              <p className="text-sm text-gray-400 mt-2">This would integrate with your existing RecordDeliveryForm component</p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}