"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Plus, 
  Filter, 
  Download, 
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  MoreHorizontal,
  Eye,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Delivery {
  id: string;
  order_id: string;
  status: "pending" | "in_transit" | "delivered" | "failed";
  delivery_date: string;
  tracking_number?: string;
  carrier?: string;
  address?: string;
  items: any[];
  created_at: string;
}

const tabs = [
  { id: "all", label: "All Deliveries", icon: Package },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "in_transit", label: "In Transit", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle },
  { id: "failed", label: "Failed", icon: AlertCircle },
];

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockDeliveries: Delivery[] = [
        {
          id: "1",
          order_id: "ORD-2024-001",
          status: "in_transit",
          delivery_date: new Date().toISOString(),
          tracking_number: "TRK123456789",
          carrier: "UPS",
          address: "123 Main St, City, State 12345",
          items: [],
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          order_id: "ORD-2024-002",
          status: "delivered",
          delivery_date: new Date(Date.now() - 86400000).toISOString(),
          tracking_number: "TRK987654321",
          carrier: "FedEx",
          address: "456 Oak Ave, City, State 67890",
          items: [],
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "3",
          order_id: "ORD-2024-003",
          status: "pending",
          delivery_date: new Date(Date.now() + 86400000).toISOString(),
          tracking_number: "TRK456789123",
          carrier: "DHL",
          address: "789 Pine Rd, City, State 54321",
          items: [],
          created_at: new Date().toISOString(),
        },
      ];
      
      setDeliveries(mockDeliveries);
    } catch (error) {
      console.error("Failed to fetch deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    if (activeTab !== "all" && delivery.status !== activeTab) return false;
    if (searchTerm && !delivery.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !delivery.order_id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-700 border-green-200";
      case "in_transit": return "bg-blue-100 text-blue-700 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "failed": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "in_transit": return <Truck className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "failed": return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout
      title="Deliveries"
      description="Manage and track all your deliveries"
      actions={
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
          Schedule Delivery
        </Button>
      }
    >
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{deliveries.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Transit</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {deliveries.filter(d => d.status === "in_transit").length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {deliveries.filter(d => d.status === "delivered").length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {deliveries.filter(d => d.status === "failed").length}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Filters and Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by tracking number or order ID..."
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
                  ? deliveries.length 
                  : deliveries.filter(d => d.status === tab.id).length;
                
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

          {/* Deliveries List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  Loading deliveries...
                </div>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
                <p className="text-gray-500 mb-4">Get started by scheduling your first delivery</p>
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Schedule Delivery
                </Button>
              </div>
            ) : (
              filteredDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        delivery.status === "delivered" ? "bg-green-50" :
                        delivery.status === "in_transit" ? "bg-blue-50" :
                        delivery.status === "pending" ? "bg-yellow-50" :
                        "bg-red-50"
                      )}>
                        {getStatusIcon(delivery.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {delivery.tracking_number || `Delivery ${delivery.id.slice(0, 8)}`}
                          </h3>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium border",
                            getStatusColor(delivery.status)
                          )}>
                            {delivery.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="font-medium">Order #{delivery.order_id}</span>
                          {delivery.carrier && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {delivery.carrier}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(delivery.delivery_date), "MMM dd, yyyy")}
                          </span>
                          {delivery.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {delivery.address.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                        View Details
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
      </div>
    </AppLayout>
  );
}