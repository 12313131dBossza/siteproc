"use client";
import { useState, useEffect } from 'react';
import { Plus, FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { Chip } from '@/components/ui/Chip';
import { DataTable } from '@/components/tables/DataTable';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';

interface ChangeOrder {
  id: string;
  coNumber: string;
  project: string;
  title: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdBy: string;
  updated: string;
  estimatedCost: number;
}

function useChangeOrders() {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setChangeOrders([
        { id: '1', coNumber: 'CO-001', project: 'Project Alpha', title: 'Foundation upgrade', status: 'approved', createdBy: 'John Doe', updated: '2025-08-30', estimatedCost: 5000 },
        { id: '2', coNumber: 'CO-002', project: 'Project Beta', title: 'Electrical modifications', status: 'submitted', createdBy: 'Jane Smith', updated: '2025-08-29', estimatedCost: 3000 },
        { id: '3', coNumber: 'CO-003', project: 'Project Gamma', title: 'Roof extension', status: 'draft', createdBy: 'Bob Wilson', updated: '2025-08-28', estimatedCost: 12000 },
        { id: '4', coNumber: 'CO-004', project: 'Project Delta', title: 'Plumbing reroute', status: 'rejected', createdBy: 'Alice Brown', updated: '2025-08-27', estimatedCost: 2500 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { changeOrders, loading, setChangeOrders };
}

export default function ChangeOrdersPage() {
  const { changeOrders, loading, setChangeOrders } = useChangeOrders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    project: '',
    description: '',
    estimatedCost: ''
  });

  const statusCounts = changeOrders.reduce((acc, co) => {
    acc[co.status] = (acc[co.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newChangeOrder: ChangeOrder = {
      id: Date.now().toString(),
      coNumber: `CO-${String(changeOrders.length + 1).padStart(3, '0')}`,
      project: formData.project,
      title: formData.title,
      status: 'draft',
      createdBy: 'Current User',
      updated: new Date().toISOString().split('T')[0],
      estimatedCost: parseFloat(formData.estimatedCost)
    };
    setChangeOrders(prev => [newChangeOrder, ...prev]);
    setFormData({ title: '', project: '', description: '', estimatedCost: '' });
    setIsModalOpen(false);
  };

  const columns = [
    { key: 'coNumber', header: 'CO #', sortable: true },
    { key: 'project', header: 'Project', sortable: true },
    { key: 'title', header: 'Title' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: string) => {
        const variants = {
          draft: 'default',
          submitted: 'warning',
          approved: 'success',
          rejected: 'danger'
        } as const;
        return (
          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
            value === 'approved' ? 'bg-green-100 text-green-800' :
            value === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
            value === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-zinc-100 text-zinc-800'
          }`}>
            {value}
          </span>
        );
      }
    },
    { key: 'createdBy', header: 'Created By' },
    { key: 'updated', header: 'Updated', sortable: true },
    { 
      key: 'estimatedCost', 
      header: 'Est. Cost',
      sortable: true,
      render: (value: number) => `$${value.toLocaleString()}`
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-zinc-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Change Orders">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New change order
        </button>
      </PageHeader>

      {/* Status Chips */}
      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-zinc-600" />
              <span className="text-sm font-medium">Draft</span>
            </div>
            <div className="text-2xl font-bold mt-1">{statusCounts.draft || 0}</div>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Submitted</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-yellow-800">{statusCounts.submitted || 0}</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Approved</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-green-800">{statusCounts.approved || 0}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Rejected</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-red-800">{statusCounts.rejected || 0}</div>
          </div>
        </div>
      </Section>

      {/* Table */}
      <Section>
        <DataTable
          columns={columns}
          data={changeOrders}
          emptyMessage="No change orders found. Create your first change order to get started."
        />
      </Section>

      {/* Modal */}
      <ModernModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Change Order"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Title"
            id="title"
            value={formData.title}
            onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
            placeholder="Brief description of the change"
            required
          />
          <FormField
            label="Project"
            id="project"
            value={formData.project}
            onChange={(value) => setFormData(prev => ({ ...prev, project: value }))}
            placeholder="Project Alpha"
            required
          />
          <FormField
            label="Description"
            id="description"
            type="textarea"
            value={formData.description}
            onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
            placeholder="Detailed description of the change order..."
            required
          />
          <FormField
            label="Estimated Cost"
            id="estimatedCost"
            type="number"
            value={formData.estimatedCost}
            onChange={(value) => setFormData(prev => ({ ...prev, estimatedCost: value }))}
            placeholder="5000"
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
              Create Change Order
            </button>
          </div>
        </form>
      </ModernModal>
    </div>
  );
}
