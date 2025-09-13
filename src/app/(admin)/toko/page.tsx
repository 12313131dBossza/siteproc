"use client";

import { useState, useEffect } from 'react';
import { Plus, Search, Package, ShoppingCart, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { ModernStatCard } from '@/components/ui/ModernStatCard';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier_id: string;
  price: number;
  stock: number;
  unit: string;
  created_at: string;
  supplier?: {
    name: string;
  };
}

interface Order {
  id: string;
  product_id: string;
  user_id: string;
  qty: number;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  product?: Product;
}

interface UserProfile {
  id: string;
  role: 'owner' | 'admin' | 'member';
}

export default function TokoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    supplier_id: '',
    price: '',
    stock: '',
    unit: 'pcs'
  });

  const supabase = createClient();
  const isAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error('[toko] auth error', authErr.message);
      }
      if (user) {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();
        if (profErr) console.warn('[toko] profile fetch error', profErr.message);
        setUserProfile(profile || { id: user.id, role: 'member' });
      }

      // Fetch products with suppliers
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .order('created_at', { ascending: false });
      if (productsError) {
        console.error('[toko] products fetch error', productsError.message, productsError.code);
        if (productsError.code === '42P01') {
          toast.error('Products table missing. Run toko-schema.sql in Supabase.');
        }
        throw productsError;
      }
      setProducts(productsData || []);

      // Fetch suppliers for dropdown
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      setSuppliers(suppliersData || []);

      // Fetch user's orders (or all if admin)
      if (user) {
        const ordersQuery = supabase
          .from('orders')
          .select(`
            *,
            product:products(*)
          `)
          .order('created_at', { ascending: false });

        const { data: ordersData, error: ordersErr } = await ordersQuery;
        if (ordersErr) {
          console.warn('[toko] orders fetch error', ordersErr.message, ordersErr.code);
        }
        setOrders(ordersData || []);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Handle product submission
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const productData = {
        name: productForm.name,
        sku: productForm.sku || null,
        category: productForm.category || null,
        supplier_id: productForm.supplier_id || null,
        price: parseFloat(productForm.price) || 0,
        stock: parseInt(productForm.stock) || 0,
        unit: productForm.unit,
        created_by: userProfile?.id
      };

      let result;
      if (editingProduct) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
      } else {
        result = await supabase
          .from('products')
          .insert([productData]);
      }

      if (result.error) throw result.error;

      toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        category: '',
        supplier_id: '',
        price: '',
        stock: '',
        unit: 'pcs'
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  // Handle order status update
  const handleOrderStatusUpdate = async (orderId: string, status: 'approved' | 'rejected') => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          decided_by: userProfile?.id,
          decided_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order ${status} successfully`);
      fetchData();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-zinc-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toko - Product Catalog</h1>
          <p className="text-gray-600 mt-1">Manage your product inventory and catalog</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsProductModalOpen(true)}
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Product
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModernStatCard 
            title="Total Products" 
            value={products.length.toString()} 
            trend={`${categories.length} categories`}
            icon={<Package className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Low Stock Items" 
            value={products.filter(p => p.stock < 10).length.toString()} 
            trend="Need attention"
            icon={<Package className="h-5 w-5" />} 
          />
          <ModernStatCard 
            title="Pending Orders" 
            value={orders.filter(o => o.status === 'pending').length.toString()} 
            trend="Awaiting approval"
            icon={<ShoppingCart className="h-5 w-5" />} 
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-sm bg-transparent placeholder:text-zinc-400 flex-1"
              placeholder="Search products..."
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-8 text-center">
            <Package className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No products found</h3>
            <p className="text-zinc-500">
              {searchQuery || categoryFilter 
                ? 'Try adjusting your search or filters.'
                : isAdmin 
                  ? 'Create your first product to get started.'
                  : 'No products available at the moment.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-900 truncate">{product.name}</h3>
                      {product.sku && (
                        <p className="text-xs text-zinc-500 mt-1">SKU: {product.sku}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="relative">
                        <button
                          className="p-1 rounded-lg hover:bg-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Add dropdown menu logic here
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {product.category && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Price:</span>
                      <span className="font-medium">${product.price.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">Stock:</span>
                      <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {product.stock} {product.unit}
                      </span>
                    </div>
                    
                    {product.supplier && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">Supplier:</span>
                        <span className="text-zinc-900 truncate max-w-24" title={product.supplier.name}>
                          {product.supplier.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href={`/orders/new?productId=${product.id}`}
                      className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                      style={{ 
                        pointerEvents: product.stock === 0 ? 'none' : 'auto',
                        opacity: product.stock === 0 ? 0.5 : 1 
                      }}
                    >
                      Request Order
                    </Link>
                    
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setProductForm({
                              name: product.name,
                              sku: product.sku || '',
                              category: product.category || '',
                              supplier_id: product.supplier_id || '',
                              price: product.price.toString(),
                              stock: product.stock.toString(),
                              unit: product.unit
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Section (Admin only) */}
      {isAdmin && orders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Orders</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-200">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900">
                      {order.product?.name}
                    </div>
                    <div className="text-sm text-zinc-500">
                      Qty: {order.qty} {order.product?.unit} • {order.note && `Note: ${order.note}`}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      order.status === 'approved' ? 'bg-green-100 text-green-800' :
                      order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                    
                    {order.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOrderStatusUpdate(order.id, 'approved')}
                          className="rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOrderStatusUpdate(order.id, 'rejected')}
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <ModernModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
          setProductForm({
            name: '',
            sku: '',
            category: '',
            supplier_id: '',
            price: '',
            stock: '',
            unit: 'pcs'
          });
        }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <FormField
            label="Product Name"
            id="name"
            value={productForm.name}
            onChange={(value) => setProductForm(prev => ({ ...prev, name: value }))}
            placeholder="Enter product name"
            required
          />
          
          <FormField
            label="SKU"
            id="sku"
            value={productForm.sku}
            onChange={(value) => setProductForm(prev => ({ ...prev, sku: value }))}
            placeholder="Product SKU (optional)"
          />
          
          <FormField
            label="Category"
            id="category"
            value={productForm.category}
            onChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
            placeholder="Product category"
          />
          
          <FormField
            label="Supplier"
            id="supplier_id"
            type="select"
            value={productForm.supplier_id}
            onChange={(value) => setProductForm(prev => ({ ...prev, supplier_id: value }))}
            options={[
              { value: '', label: 'No supplier' },
              ...suppliers.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Price"
              id="price"
              type="number"
              value={productForm.price}
              onChange={(value) => setProductForm(prev => ({ ...prev, price: value }))}
              placeholder="0.00"
              required
            />
            
            <FormField
              label="Stock"
              id="stock"
              type="number"
              value={productForm.stock}
              onChange={(value) => setProductForm(prev => ({ ...prev, stock: value }))}
              placeholder="0"
              required
            />
          </div>
          
          <FormField
            label="Unit"
            id="unit"
            type="select"
            value={productForm.unit}
            onChange={(value) => setProductForm(prev => ({ ...prev, unit: value }))}
            options={[
              { value: 'pcs', label: 'Pieces' },
              { value: 'kg', label: 'Kilograms' },
              { value: 'bags', label: 'Bags' },
              { value: 'sets', label: 'Sets' },
              { value: 'pairs', label: 'Pairs' },
              { value: 'meters', label: 'Meters' }
            ]}
          />
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </ModernModal>
    </div>
  );
}
