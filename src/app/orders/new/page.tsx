"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, ShoppingCart } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/CurrencyContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
}

function NewOrderForm() {
  const { formatAmount } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    qty: '',
    notes: '',
    projectId: ''
  });

  const [projects, setProjects] = useState<Array<{ id: string; name: string; code?: string }>>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const preselectedProductId = searchParams.get('productId');

  useEffect(() => {
    fetchProducts();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('🔍 Fetching projects from /api/projects...');
      const response = await fetch('/api/projects');
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Projects data received:', data);
        console.log('📊 Is array?', Array.isArray(data));
        console.log('📈 Projects count:', data?.length || 0);
        
        // API returns projects array directly, not wrapped in data object
        setProjects(Array.isArray(data) ? data : []);
        console.log('✅ Projects set to state:', Array.isArray(data) ? data : []);
      } else {
        console.error('❌ Failed to fetch projects:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('💥 Failed to load projects:', error);
      toast.error('Failed to load projects');
    }
  };

  useEffect(() => {
    if (preselectedProductId && products.length > 0) {
      const product = products.find(p => p.id === preselectedProductId);
      if (product) {
        setSelectedProduct(product);
        setFormData(prev => ({ ...prev, product_id: product.id }));
      }
    }
  }, [preselectedProductId, products]);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0) // Only show products with stock
        .order('name');

      if (error) throw error;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setFormData(prev => ({ ...prev, product_id: productId, qty: '', projectId: prev.projectId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !formData.qty || !formData.projectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const qty = parseFloat(formData.qty);
    if (qty <= 0 || qty > selectedProduct.stock) {
      toast.error(`Invalid quantity. Available stock: ${selectedProduct.stock}`);
      return;
    }

    setSubmitting(true);
    try {
      // Calculate total amount
      const totalAmount = selectedProduct.price * qty;
      
      // Prepare description with product details
      const description = `${selectedProduct.name} (${qty} ${selectedProduct.unit})${formData.notes ? ` - ${formData.notes}` : ''}`;
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: formData.projectId || null,
          amount: totalAmount,
          description: description,
          category: selectedProduct.category || 'General'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create order' }));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: Failed to create order`;
        console.error('API Error Response:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const order = result.data || result;

      toast.success('Order request submitted successfully!');
      router.push('/orders'); // Redirect to orders list instead of detail page
    } catch (error) {
      console.error('Error creating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="bg-zinc-200 rounded-2xl h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <AppLayout
      title="Create New Order"
      description="Add a new product order to your procurement list"
      actions={
        <Link href="/orders">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Orders
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-medium text-zinc-900">Order Details</h2>
              </div>

              <div className="space-y-4">
                <FormField
                  label="Product"
                  id="product_id"
                  type="select"
                  value={formData.product_id}
                  onChange={(value) => handleProductChange(value)}
                  required
                  options={[
                    { value: '', label: 'Select a product...' },
                    ...products.map(product => ({
                      value: product.id,
                      label: `${product.name}${product.sku ? ` (${product.sku})` : ''} - ${formatAmount(product.price)} - ${product.stock} in stock`
                    }))
                  ]}
                />

                <FormField
                  label="Project"
                  id="project_id"
                  type="select"
                  value={formData.projectId}
                  onChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                  required
                  options={[
                    { value: '', label: 'Select an option' },
                    ...projects.map(project => ({
                      value: project.id,
                      label: project.name
                    }))
                  ]}
                />

                {selectedProduct && (
                  <div className="rounded-xl bg-indigo-50 p-4">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-indigo-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-900 mb-1">
                          {selectedProduct.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-600">
                          <div>
                            <span className="font-medium">Price:</span> ${selectedProduct.price.toFixed(2)} per {selectedProduct.unit}
                          </div>
                          <div>
                            <span className="font-medium">Available:</span> {selectedProduct.stock} {selectedProduct.unit}
                          </div>
                          {selectedProduct.sku && (
                            <div>
                              <span className="font-medium">SKU:</span> {selectedProduct.sku}
                            </div>
                          )}
                          {selectedProduct.category && (
                            <div>
                              <span className="font-medium">Category:</span> {selectedProduct.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  label="Quantity"
                  id="qty"
                  type="number"
                  value={formData.qty}
                  onChange={(value) => setFormData(prev => ({ ...prev, qty: value }))}
                  required
                  min="0.01"
                  max={selectedProduct?.stock || undefined}
                  step="0.01"
                  placeholder="Enter quantity..."
                  helpText={selectedProduct ? `Available: ${selectedProduct.stock} ${selectedProduct.unit}` : undefined}
                />

                <FormField
                  label="Notes (Optional)"
                  id="notes"
                  type="textarea"
                  value={formData.notes}
                  onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                  placeholder="Any special requirements, delivery instructions, or comments..."
                  rows={3}
                />

                {selectedProduct && formData.qty && (
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-600">Total Cost:</span>
                      <span className="font-medium text-zinc-900">
                        ${(selectedProduct.price * parseFloat(formData.qty || '0')).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-200 mt-6">
                <Link
                  href="/orders"
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-center hover:bg-zinc-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={!selectedProduct || !formData.qty || !formData.projectId || submitting}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="bg-zinc-200 rounded-2xl h-64 animate-pulse" />
      </div>
    }>
      <NewOrderForm />
    </Suspense>
  );
}
