"use client";
import { useState, useEffect } from 'react';
import { Plus, UserPlus, Crown, Shield, User } from 'lucide-react';
import { PageHeader, Section } from '@/components/ui/Layout';
import { DataTable } from '@/components/tables/DataTable';
import { ModernModal } from '@/components/ui/ModernModal';
import { FormField } from '@/components/forms/FormField';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joined: string;
  lastActive: string;
}

function useUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setUsers([
        { id: '1', name: 'John Doe', email: 'john@company.com', role: 'owner', joined: '2025-01-15', lastActive: '2025-08-30' },
        { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'admin', joined: '2025-02-20', lastActive: '2025-08-29' },
        { id: '3', name: 'Bob Wilson', email: 'bob@company.com', role: 'member', joined: '2025-03-10', lastActive: '2025-08-28' },
        { id: '4', name: 'Alice Brown', email: 'alice@company.com', role: 'member', joined: '2025-04-05', lastActive: '2025-08-25' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return { users, loading, setUsers };
}

export default function UsersPage() {
  const { users, loading, setUsers } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: ''
  });

  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send an invitation email
    console.log('Invite user:', formData);
    setFormData({ email: '', role: '' });
    setIsModalOpen(false);
    // Show success toast
    alert('Invitation sent successfully!');
  };

  const columns = [
    { 
      key: 'name', 
      header: 'Name/Email',
      render: (value: string, row: UserData) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-zinc-500">{row.email}</div>
        </div>
      )
    },
    { 
      key: 'role', 
      header: 'Role',
      render: (value: string) => {
        const roleConfig = {
          owner: { icon: Crown, bg: 'bg-purple-100', text: 'text-purple-800' },
          admin: { icon: Shield, bg: 'bg-blue-100', text: 'text-blue-800' },
          member: { icon: User, bg: 'bg-zinc-100', text: 'text-zinc-800' }
        };
        const config = roleConfig[value as keyof typeof roleConfig];
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
            <Icon className="h-3 w-3" />
            {value}
          </span>
        );
      }
    },
    { key: 'joined', header: 'Joined', sortable: true },
    { key: 'lastActive', header: 'Last Active', sortable: true }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-zinc-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Invite user
        </button>
      </PageHeader>

      {/* Role Chips */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">Owner</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-purple-800">{roleCounts.owner || 0}</div>
            <div className="text-sm text-purple-600 mt-1">Full access</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Admin</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-blue-800">{roleCounts.admin || 0}</div>
            <div className="text-sm text-blue-600 mt-1">Manage operations</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-zinc-600" />
              <span className="font-medium text-zinc-800">Member</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-zinc-800">{roleCounts.member || 0}</div>
            <div className="text-sm text-zinc-600 mt-1">Basic access</div>
          </div>
        </div>
      </Section>

      {/* Table */}
      <Section>
        <DataTable
          columns={columns}
          data={users}
          emptyMessage="No users found. Invite your first team member to get started."
        />
      </Section>

      {/* Modal */}
      <ModernModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite User"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Email Address"
            id="email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
            placeholder="user@company.com"
            required
          />
          <FormField
            label="Role"
            id="role"
            type="select"
            value={formData.role}
            onChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            options={[
              { value: 'member', label: 'Member - Basic access' },
              { value: 'admin', label: 'Admin - Manage operations' },
              { value: 'owner', label: 'Owner - Full access' }
            ]}
            required
          />
          <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
            <div className="font-medium mb-1">What happens next:</div>
            <ul className="text-xs space-y-1">
              <li>• User will receive an invitation email</li>
              <li>• They can set up their account and password</li>
              <li>• Access will be granted based on selected role</li>
            </ul>
          </div>
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
              Send Invitation
            </button>
          </div>
        </form>
      </ModernModal>
    </div>
  );
}
