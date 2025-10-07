'use client';

import { useState } from 'react';
import { X, Plus, Package, DollarSign, Truck } from 'lucide-react';

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
    status: 'pending'
  });

  // Delivery form fields
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: ''
  });

  if (!isOpen) return null;

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
        endpoint = `/api/expenses`;
        body = {
          ...expenseForm,
          project_id: projectId,
        };
        console.log('Creating expense:', body);
      } else if (type === 'delivery') {
        endpoint = `/api/deliveries`;
        body = {
          ...deliveryForm,
          project_id: projectId,
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
      setExpenseForm({ vendor: '', category: 'materials', amount: 0, description: '', status: 'pending' });
      setDeliveryForm({ delivery_date: new Date().toISOString().split('T')[0], status: 'pending', notes: '' });
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
                  Vendor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vendor/supplier name"
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
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
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
