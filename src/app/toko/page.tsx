"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import {
  Package,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Star,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock_quantity: number;
  min_stock_level: number;
  reorder_point?: number;
  reorder_quantity?: number;
  stock_status?: string;
  last_restock_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  lead_time_days?: number;
  description?: string;
  status: 'active' | 'inactive' | 'discontinued';
  last_ordered?: string;
  total_orders: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

interface ProductStats {
  total_products: number;
  active_products: number;
  low_stock_items: number;
  total_value: number;
  top_category: string;
  monthly_orders: number;
}

export default function TokoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'low-stock' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    total_products: 0,
    active_products: 0,
    low_stock_items: 0,
    total_value: 0,
    top_category: '',
    monthly_orders: 0
  });

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data || []);
      
      // Calculate stats from real data
      const statsData: ProductStats = {
        total_products: data.length,
        active_products: data.filter((p: Product) => p.status === 'active').length,
        low_stock_items: data.filter((p: Product) => p.stock_quantity <= p.min_stock_level).length,
        total_value: data.reduce((sum: number, p: Product) => sum + (p.price * p.stock_quantity), 0),
        top_category: data.length > 0 ? data[0].category : '',
        monthly_orders: data.reduce((sum: number, p: Product) => sum + p.total_orders, 0)
      };
      
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
      
      // Fallback to mock data if API fails
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Construction Steel Beams',
          category: 'Steel & Metal',
          price: 1500,
          unit: 'pcs',
          stock_quantity: 25,
          min_stock_level: 10,
          supplier_name: 'Steel Suppliers Co.',
          description: 'High-grade steel beams for construction projects',
          status: 'active',
          last_ordered: new Date(Date.now() - 86400000 * 7).toISOString(),
          total_orders: 45,
          rating: 4.8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Premium Concrete Mix',
          category: 'Concrete & Cement',
          price: 85,
          unit: 'bags',
          stock_quantity: 150,
          min_stock_level: 50,
          supplier_name: 'Concrete Solutions Ltd.',
          description: 'High-strength concrete mix for foundations',
          status: 'active',
          last_ordered: new Date(Date.now() - 86400000 * 3).toISOString(),
          total_orders: 120,
          rating: 4.6,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Electrical Wiring Kit',
          category: 'Electrical',
          price: 250,
          unit: 'kit',
          stock_quantity: 8,
          min_stock_level: 15,
          supplier_name: 'ElectroTech Supplies',
          description: 'Complete electrical wiring kit for residential projects',
          status: 'active',
          last_ordered: new Date(Date.now() - 86400000 * 14).toISOString(),
          total_orders: 35,
          rating: 4.4,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Ceramic Floor Tiles',
          category: 'Tiles & Flooring',
          price: 45,
          unit: 'sqm',
          stock_quantity: 200,
          min_stock_level: 100,
          supplier_name: 'Tile World Inc.',
          description: 'Premium ceramic tiles for flooring applications',
          status: 'active',
          last_ordered: new Date(Date.now() - 86400000 * 5).toISOString(),
          total_orders: 85,
          rating: 4.7,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Paint Primer (White)',
          category: 'Paint & Finishes',
          price: 35,
          unit: 'liters',
          stock_quantity: 5,
          min_stock_level: 20,
          supplier_name: 'ColorTech Paints',
          description: 'High-quality primer for interior and exterior surfaces',
          status: 'inactive',
          last_ordered: new Date(Date.now() - 86400000 * 30).toISOString(),
          total_orders: 25,
          rating: 4.2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setProducts(mockProducts);
      
      // Calculate stats
      const statsData: ProductStats = {
        total_products: mockProducts.length,
        active_products: mockProducts.filter(p => p.status === 'active').length,
        low_stock_items: mockProducts.filter(p => p.stock_quantity <= p.min_stock_level).length,
        total_value: mockProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
        top_category: 'Steel & Metal',
        monthly_orders: 285
      };
      
      setStats(statsData);
      setProducts(mockProducts);
    }
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/inventory/alerts?resolved=false');
      const data = await response.json();
      setAlerts(data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    const matchesTab = selectedTab === 'all' || 
                      (selectedTab === 'active' && product.status === 'active') ||
                      (selectedTab === 'low-stock' && product.stock_quantity <= product.min_stock_level) ||
                      (selectedTab === 'inactive' && product.status === 'inactive');
    
    return matchesSearch && matchesCategory && matchesStatus && matchesTab;
  });

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= product.min_stock_level) {
      return { status: 'low', color: 'text-red-600 bg-red-50 border-red-200', label: 'Low Stock' };
    } else if (product.stock_quantity <= product.min_stock_level * 1.5) {
      return { status: 'medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Medium Stock' };
    } else {
      return { status: 'good', color: 'text-green-600 bg-green-50 border-green-200', label: 'Good Stock' };
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { color: 'text-green-600 bg-green-50 border-green-200', label: 'Active', icon: CheckCircle },
      inactive: { color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Inactive', icon: XCircle },
      discontinued: { color: 'text-red-600 bg-red-50 border-red-200', label: 'Discontinued', icon: AlertTriangle }
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const productData = {
      name: formData.get('name'),
      category: formData.get('category'),
      price: parseFloat(formData.get('price') as string),
      unit: formData.get('unit'),
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      min_stock_level: parseInt(formData.get('min_stock_level') as string),
      reorder_point: parseInt(formData.get('reorder_point') as string) || 15,
      reorder_quantity: parseInt(formData.get('reorder_quantity') as string) || 50,
      description: formData.get('description'),
      status: formData.get('status'),
      supplier_name: formData.get('supplier_name'),
      supplier_email: formData.get('supplier_email'),
      supplier_phone: formData.get('supplier_phone'),
      lead_time_days: parseInt(formData.get('lead_time_days') as string) || 7
    };

    try {
      const url = selectedProduct 
        ? `/api/products/${selectedProduct.id}`
        : '/api/products';
      
      const method = selectedProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (!response.ok) throw new Error('Failed to save product');

      toast.success(`Product ${selectedProduct ? 'updated' : 'created'} successfully`);
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchAlerts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleInventoryAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const transaction_type = formData.get('transaction_type') as string;
    const quantity = parseInt(formData.get('quantity') as string);
    const unit_cost = parseFloat(formData.get('unit_cost') as string) || 0;
    const notes = formData.get('notes') as string;

    // Determine if it's addition or subtraction
    const quantity_change = ['purchase', 'return', 'adjustment'].includes(transaction_type) && quantity > 0
      ? quantity
      : -Math.abs(quantity);

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_type,
          quantity_change,
          unit_cost: unit_cost || null,
          notes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to adjust inventory');
      }

      toast.success('Inventory adjusted successfully');
      setIsAdjustModalOpen(false);
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error('Error adjusting inventory:', error);
      toast.error(error.message || 'Failed to adjust inventory');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');

      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Toko" description="Product catalog and inventory management">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2" />
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Toko"
      description="Product catalog and inventory management"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button variant="ghost" leftIcon={<BarChart3 className="h-4 w-4" />}>
            Analytics
          </Button>
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
            Add Product
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
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.total_products}</h3>
            <p className="text-sm text-gray-500">Total Products</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">{stats.active_products}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.active_products}</h3>
            <p className="text-sm text-gray-500">Active Products</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-sm font-medium text-red-600">{stats.low_stock_items}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.low_stock_items}</h3>
            <p className="text-sm text-gray-500">Low Stock Items</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-600">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.total_value)}</h3>
            <p className="text-sm text-gray-500">Inventory Value</p>
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
                    placeholder="Search products, categories, or suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
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
                { key: 'all', label: 'All Products', count: products.length },
                { key: 'active', label: 'Active', count: products.filter(p => p.status === 'active').length },
                { key: 'low-stock', label: 'Low Stock', count: products.filter(p => p.stock_quantity <= p.min_stock_level).length },
                { key: 'inactive', label: 'Inactive', count: products.filter(p => p.status === 'inactive').length }
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

          {/* Product List */}
          <div className="p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or add a new product.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const statusConfig = getStatusConfig(product.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-500">{product.category}</span>
                            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium", statusConfig.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</span>
                          <span className="text-sm text-gray-500">per {product.unit}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Stock: {product.stock_quantity} {product.unit}</span>
                          <div className={cn("px-2 py-1 rounded-full text-xs font-medium border", stockStatus.color)}>
                            {stockStatus.label}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">({product.total_orders} orders)</span>
                        </div>

                        {product.supplier_name && (
                          <div className="text-sm text-gray-500">
                            Supplier: {product.supplier_name}
                          </div>
                        )}

                        {product.last_ordered && (
                          <div className="text-xs text-gray-400">
                            Last ordered: {format(new Date(product.last_ordered), 'MMM dd, yyyy')}
                          </div>
                        )}

                        <div className="pt-3 border-t border-gray-200">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full"
                            leftIcon={<Package className="w-4 h-4" />}
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsAdjustModalOpen(true);
                            }}
                          >
                            Adjust Stock
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-blue-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
                setSelectedProduct(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedProduct ? 'Update product information and inventory settings' : 'Fill in the details to add a new product to your inventory'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedProduct(null);
                  }}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        name="name"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                        defaultValue={selectedProduct?.name}
                        placeholder="Enter product name"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.category}
                        required
                      >
                        <option value="">Select category</option>
                        {Array.from(new Set([...categories, 'Steel & Metal', 'Concrete & Cement', 'Electrical', 'Tiles & Flooring', 'Paint & Finishes', 'Plumbing', 'Tools', 'Safety Equipment', 'Hardware', 'Wood & Lumber'])).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.status || 'active'}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing & Units Section */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Pricing & Units
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input 
                          type="number"
                          name="price"
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          defaultValue={selectedProduct?.price}
                          placeholder="0.00"
                          required 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        name="unit"
                        list="unit-suggestions"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.unit}
                        placeholder="e.g., pcs, kg, liters"
                        required 
                      />
                      <datalist id="unit-suggestions">
                        <option value="pcs" />
                        <option value="kg" />
                        <option value="liters" />
                        <option value="meters" />
                        <option value="sqm" />
                        <option value="bags" />
                        <option value="boxes" />
                        <option value="rolls" />
                        <option value="sets" />
                        <option value="pairs" />
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Inventory Management Section */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Inventory Management
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Quantity <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number"
                        name="stock_quantity"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        defaultValue={selectedProduct?.stock_quantity || 0}
                        placeholder="Current stock quantity"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Stock Level <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number"
                        name="min_stock_level"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        defaultValue={selectedProduct?.min_stock_level || 10}
                        placeholder="Minimum before alert"
                        required 
                      />
                      <p className="mt-1 text-xs text-gray-500">Alert triggers when stock reaches this level</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reorder Point
                      </label>
                      <input 
                        type="number"
                        name="reorder_point"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        defaultValue={selectedProduct?.reorder_point || 15}
                        placeholder="Stock level to trigger reorder"
                      />
                      <p className="mt-1 text-xs text-gray-500">Suggests reordering at this level</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reorder Quantity
                      </label>
                      <input 
                        type="number"
                        name="reorder_quantity"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                        defaultValue={selectedProduct?.reorder_quantity || 50}
                        placeholder="Suggested order quantity"
                      />
                      <p className="mt-1 text-xs text-gray-500">Recommended quantity to order</p>
                    </div>
                  </div>
                </div>

                {/* Supplier Information Section */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Supplier Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                      <input 
                        type="text"
                        name="supplier_name"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.supplier_name}
                        placeholder="Supplier company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Email</label>
                      <input 
                        type="email"
                        name="supplier_email"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.supplier_email}
                        placeholder="supplier@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Phone</label>
                      <input 
                        type="tel"
                        name="supplier_phone"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.supplier_phone}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lead Time (Days)
                      </label>
                      <input 
                        type="number"
                        name="lead_time_days"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        defaultValue={selectedProduct?.lead_time_days || 7}
                        placeholder="Expected delivery time in days"
                      />
                      <p className="mt-1 text-xs text-gray-500">How many days from order to delivery</p>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                    rows={4}
                    defaultValue={selectedProduct?.description}
                    placeholder="Enter product description, specifications, or notes..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedProduct(null);
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="flex-1"
                    leftIcon={selectedProduct ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  >
                    {selectedProduct ? 'Update Product' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Details Modal */}
        {isDetailsModalOpen && selectedProduct && (
          <div 
            className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-blue-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDetailsModalOpen(false);
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedProduct.name}</h3>
                  <p className="text-gray-600">{selectedProduct.category}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pricing</h4>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedProduct.price)}</p>
                    <p className="text-sm text-gray-500">per {selectedProduct.unit}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Stock Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Stock:</span>
                        <span className="font-medium">{selectedProduct.stock_quantity} {selectedProduct.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Min Level:</span>
                        <span className="font-medium">{selectedProduct.min_stock_level} {selectedProduct.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", getStockStatus(selectedProduct).color)}>
                          {getStockStatus(selectedProduct).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Orders:</span>
                        <span className="font-medium">{selectedProduct.total_orders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Rating:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{selectedProduct.rating}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < Math.floor(selectedProduct.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedProduct.supplier_name && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Supplier</h4>
                      <p className="text-gray-600">{selectedProduct.supplier_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedProduct.description && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedProduct.description}</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Created: {format(new Date(selectedProduct.created_at), 'MMM dd, yyyy')}</span>
                  {selectedProduct.last_ordered && (
                    <span>Last ordered: {format(new Date(selectedProduct.last_ordered), 'MMM dd, yyyy')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Adjustment Modal */}
        {isAdjustModalOpen && selectedProduct && (
          <div 
            className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-purple-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAdjustModalOpen(false);
                setSelectedProduct(null);
              }
            }}
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Adjust Inventory: {selectedProduct.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setSelectedProduct(null);
                  }}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedProduct.stock_quantity} {selectedProduct.unit}
                  </span>
                </div>
              </div>
              <form onSubmit={handleInventoryAdjust} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                  <select 
                    name="transaction_type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="purchase">Purchase (Add Stock)</option>
                    <option value="sale">Sale (Remove Stock)</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="return">Return (Add Stock)</option>
                    <option value="damaged">Damaged (Remove Stock)</option>
                    <option value="theft">Theft (Remove Stock)</option>
                    <option value="count">Stock Count Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    name="quantity"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                    required 
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    For removals (sale, damaged, theft), enter positive number
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Optional)</label>
                  <input 
                    type="number" 
                    name="unit_cost"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cost per unit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea 
                    name="notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    rows={3}
                    placeholder="Add notes about this transaction..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setIsAdjustModalOpen(false);
                      setSelectedProduct(null);
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    Adjust Inventory
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}