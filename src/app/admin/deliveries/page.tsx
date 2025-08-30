"use client";
import { useState, useEffect } from 'react';
import { Plus, Truck, Package, Clock, Search } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { ModernStatCard } from '@/components/ui/ModernStatCard';
import { DataTable } from '@/components/tables/DataTable';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';
import RoleGate from '@/components/RoleGate';

interface Delivery {
  id: string;
  ref: string;
  vendor: string;
  items: string;
  status: 'pending' | 'received' | 'rejected';
  receivedBy?: string;
  date: string;
}

// Mock data and hooks
function useDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDeliveries([
        { id: '1', ref: 'D-001', vendor: 'ABC Supply', items: '50 bags cement, 20 rebar', status: 'received', receivedBy: 'John Doe', date: '2025-08-30' },
        { id: '2', ref: 'D-002', vendor: 'XYZ Materials', items: '100 blocks', status: 'pending', date: '2025-08-31' },
        { id: '3', ref: 'D-003', vendor: 'Steel Co', items: '10 beams', status: 'rejected', date: '2025-08-29' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { deliveries, loading, setDeliveries };
}

function DeliveriesContent() {
  const { deliveries, loading, setDeliveries } = useDeliveries();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    ref: '',
    vendor: '',
    items: '',
    expectedDate: ''
  });

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         delivery.ref.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDelivery: Delivery = {
      id: Date.now().toString(),
      ref: formData.ref,
      vendor: formData.vendor,
      items: formData.items,
      status: 'pending',
      date: formData.expectedDate
    };
    setDeliveries(prev => [newDelivery, ...prev]);
    setFormData({ ref: '', vendor: '', items: '', expectedDate: '' });
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'ref', header: 'Ref', sortable: true },
    { key: 'vendor', header: 'Vendor', sortable: true },
    { key: 'items', header: 'Items' },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
          value === 'received' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    { key: 'receivedBy', header: 'Received By' },
    { key: 'date', header: 'Date', sortable: true }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="h-8 bg-zinc-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-200 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <PageHeader title="Deliveries">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New delivery
            </button>
          </PageHeader>

          {/* Filters */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="outline-none text-sm bg-transparent placeholder:text-zinc-400 flex-1"
                  placeholder="Search deliveries..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                type="date"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </Section>

          {/* Stats */}
          <Section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModernStatCard title="Open deliveries" value="12" trend="+3 this week" icon={<Package className="h-5 w-5" />} />
              <ModernStatCard title="Received this week" value="8" trend="+2 vs last week" icon={<Truck className="h-5 w-5" />} />
              <ModernStatCard title="Late deliveries" value="2" trend="Need attention" icon={<Clock className="h-5 w-5" />} />
            </div>
          </Section>

          {/* Table */}
          <Section>
            <DataTable
              columns={columns}
              data={filteredDeliveries}
              emptyMessage="No deliveries found. Create your first delivery to get started."
            />
          </Section>

          {/* Modal */}
          <ModernModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="New Delivery"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Reference"
                id="ref"
                value={formData.ref}
                onChange={(value) => setFormData(prev => ({ ...prev, ref: value }))}
                placeholder="D-001"
                required
              />
              <FormField
                label="Vendor"
                id="vendor"
                value={formData.vendor}
                onChange={(value) => setFormData(prev => ({ ...prev, vendor: value }))}
                placeholder="ABC Supply Co"
                required
              />
              <FormField
                label="Items"
                id="items"
                type="textarea"
                value={formData.items}
                onChange={(value) => setFormData(prev => ({ ...prev, items: value }))}
                placeholder="List of materials and quantities..."
                required
              />
              <FormField
                label="Expected Date"
                id="expectedDate"
                type="date"
                value={formData.expectedDate}
                onChange={(value) => setFormData(prev => ({ ...prev, expectedDate: value }))}
                required
              />
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Create Delivery
                </button>
              </div>
            </form>
          </ModernModal>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <DeliveriesContent />
    </RoleGate>
  );
}
