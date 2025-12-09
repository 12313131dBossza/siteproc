'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/Button';
import { FormModal } from '@/components/ui/FormModal';
import { Plus, Search, Edit, Trash2, X, Users, Phone, Mail, MapPin, Building, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/CurrencyContext';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  industry?: string;
  total_projects?: number;
  total_value?: number;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export default function ClientsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    industry: '',
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      
      const data = await res.json();
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submitting) return;
    setSubmitting(true);

    // For new clients, use optimistic update
    if (!editingClient) {
      const tempId = `temp-${Date.now()}`;
      const optimisticClient: Client = {
        id: tempId,
        name: form.name,
        company_name: form.company_name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        industry: form.industry || undefined,
        status: form.status,
        notes: form.notes || undefined,
        created_at: new Date().toISOString(),
        total_projects: 0,
        total_value: 0
      };

      // Optimistically add and close modal immediately
      setClients(prev => [optimisticClient, ...prev]);
      setShowModal(false);
      const savedForm = { ...form };
      resetForm();

      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedForm)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to save client');
        }

        const created = await res.json();
        // Replace temp with real client
        setClients(prev => prev.map(c => 
          c.id === tempId ? { ...created, id: created.id } : c
        ));
        toast.success('Client created successfully');
      } catch (error: any) {
        console.error('Error saving client:', error);
        // Rollback optimistic update
        setClients(prev => prev.filter(c => c.id !== tempId));
        toast.error(error.message || 'Failed to save client');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // For editing, use normal flow
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save client');
      }

      toast.success('Client updated successfully');
      setShowModal(false);
      setEditingClient(null);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || '',
      industry: client.industry || '',
      status: client.status,
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    // Store for rollback
    const deletedClient = clients.find(c => c.id === id);
    
    // Optimistically remove from list immediately
    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Client deleted successfully');

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete client');
      }
    } catch (error: any) {
      console.error('Error deleting client:', error);
      // Rollback on error
      if (deletedClient) {
        setClients(prev => [...prev, deletedClient]);
      }
      toast.error(error.message || 'Failed to delete client');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      industry: '',
      status: 'active',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return styles[status as keyof typeof styles] || styles.active;
  };

  const { formatAmount: formatCurrency } = useCurrency();

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout
      title="Clients"
      description="Manage project owners and customers"
      actions={
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingClient(null);
            resetForm();
            setShowModal(true);
          }}
        >
          Add Client
        </Button>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total Clients</div>
            <div className="text-xl font-bold text-gray-900">{clients.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-700 mb-1">Active</div>
            <div className="text-xl font-bold text-green-900">
              {clients.filter(c => c.status === 'active').length}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-700 mb-1">Total Projects</div>
            <div className="text-xl font-bold text-blue-900">
              {clients.reduce((sum, c) => sum + (c.total_projects || 0), 0)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-lg p-3">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Clients Grid */}
        {loading && clients.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading clients...</p>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Get started by adding your first client'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowModal(true)}
              >
                Add Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{client.name}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap', getStatusBadge(client.status))}>
                        {client.status}
                      </span>
                    </div>
                    {client.company_name && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                        <Building className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{client.company_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3 text-xs">
                  {client.industry && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 flex-shrink-0" />
                      {client.industry}
                    </p>
                  )}
                  {client.email && (
                    <p className="text-gray-600 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      {client.phone}
                    </p>
                  )}
                  {(client.city || client.state) && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {[client.city, client.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deleting === client.id}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deleting === client.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <FormModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
          title={editingClient ? 'Edit Client' : 'Add New Client'}
          description="Enter client details and contact information"
          icon={<Users className="h-5 w-5" />}
          size="lg"
          footer={
            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingClient(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="client-form"
                disabled={submitting}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>{editingClient ? 'Update Client' : 'Create Client'}</>
                )}
              </button>
            </div>
          }
        >
          <form id="client-form" onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="ABC Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="10001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Construction, Real Estate, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
          </form>
        </FormModal>
      </div>
    </AppLayout>
  );
}
