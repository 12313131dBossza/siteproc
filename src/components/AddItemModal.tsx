'use client';

import { useState } from 'react';
import { X, Plus, Package, DollarSign, Truck, Upload, FileText, Image as ImageIcon } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  type: 'order' | 'expense' | 'delivery';
  onSuccess: () => void;
}

export function AddItemModal({ isOpen, onClose, projectId, type, onSuccess }: AddItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  
  // Order form fields
  const [orderForm, setOrderForm] = useState({
    vendor: '',
    product_name: '',
    qty: 1,
    unit_price: 0,
    status: 'pending'
  });

  // Expense form fields
  const [expenseForm, setExpenseForm] = useState({
    vendor: '',
    category: 'materials',
    amount: 0,
    description: '',
    status: 'pending',
    payment_method: 'petty_cash'
  });

  // Delivery form fields
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
    proof_url: ''
  });

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(undefined);

    // Upload immediately
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadedFileUrl(data.url);
      setDeliveryForm({ ...deliveryForm, proof_url: data.url });
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setSelectedFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      let endpoint = '';
      let body: any = {};

      if (type === 'order') {
        endpoint = `/api/orders`;
        body = {
          ...orderForm,
          project_id: projectId,
        };
        console.log('Creating order:', body);
      } else if (type === 'expense') {
        // Validate vendor is provided
        if (!expenseForm.vendor.trim()) {
          setError('Vendor / Supplier is required');
          setLoading(false);
          return;
        }
        endpoint = `/api/expenses`;
        body = {
          ...expenseForm,
          vendor: expenseForm.vendor.trim(),
          project_id: projectId,
          payment_method: expenseForm.payment_method,
        };
        console.log('Creating expense:', body);
      } else if (type === 'delivery') {
        endpoint = `/api/order-deliveries`;  // Fixed: was /api/deliveries
        body = {
          ...deliveryForm,
          proof_url: uploadedFileUrl || deliveryForm.proof_url,
          project_id: projectId,
          // Don't set order_id - it's a UUID foreign key to purchase_orders
          // The API will handle manual entries without an order_id
          items: [{
            product_name: deliveryForm.notes || 'Manual entry from project',
            quantity: 1,
            unit: 'item',
            unit_price: 0
          }]
        };
        console.log('Creating delivery:', body);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseData = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      console.log('API Response:', responseData);

      if (!res.ok) {
        throw new Error(responseData.error || responseData.details || `Failed to create ${type} (${res.status})`);
      }

      // Success!
      onSuccess();
      onClose();
      
      // Reset forms
      setOrderForm({ vendor: '', product_name: '', qty: 1, unit_price: 0, status: 'pending' });
      setExpenseForm({ vendor: '', category: 'materials', amount: 0, description: '', status: 'pending', payment_method: 'petty_cash' });
      setDeliveryForm({ delivery_date: new Date().toISOString().split('T')[0], status: 'pending', notes: '', proof_url: '' });
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'order': return <Package className="h-5 w-5" />;
      case 'expense': return <DollarSign className="h-5 w-5" />;
      case 'delivery': return <Truck className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'order': return 'Add Purchase Order';
      case 'expense': return 'Add Expense';
      case 'delivery': return 'Add Delivery';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {getIcon()}
            </div>
            <h2 className="text-xl font-semibold">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Order Form */}
          {type === 'order' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.vendor}
                  onChange={(e) => setOrderForm({ ...orderForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderForm.product_name}
                  onChange={(e) => setOrderForm({ ...orderForm, product_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Steel Beams, Cement Bags"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={orderForm.qty}
                    onChange={(e) => setOrderForm({ ...orderForm, qty: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={orderForm.unit_price}
                    onChange={(e) => setOrderForm({ ...orderForm, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="pt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Total:</strong> ${(orderForm.qty * orderForm.unit_price).toFixed(2)}
              </div>
            </>
          )}

          {/* Expense Form */}
          {type === 'expense' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor / Supplier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Home Depot, ABC Concrete, John's Trucking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="materials">Materials</option>
                  <option value="labor">Labor</option>
                  <option value="equipment">Equipment</option>
                  <option value="transportation">Transportation</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid Through <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="petty_cash">Petty Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={expenseForm.status}
                  onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </>
          )}

          {/* Delivery Form */}
          {type === 'delivery' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={deliveryForm.delivery_date}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={deliveryForm.status}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Delivery instructions, items, etc."
                  rows={4}
                />
              </div>

              {/* Proof of Delivery Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof of Delivery (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="pod-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="pod-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {uploadingFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : selectedFile ? (
                      <div className="flex items-center gap-3 w-full">
                        {selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="h-8 w-8 text-blue-600" />
                        ) : (
                          <FileText className="h-8 w-8 text-red-600" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB • ✅ Uploaded
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                            setUploadedFileUrl('');
                            setDeliveryForm({ ...deliveryForm, proof_url: '' });
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload image or PDF
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF, WebP or PDF (max 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create {type === 'order' ? 'Order' : type === 'expense' ? 'Expense' : 'Delivery'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
