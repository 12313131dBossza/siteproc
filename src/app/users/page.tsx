"use client";

import React, { useState, useEffect } from 'react';
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/StatCard";
import { LimitBanner } from "@/components/FeatureGate";
import { usePlan } from "@/hooks/usePlan";
import { BILLABLE_ROLES } from "@/lib/plans";
import {
  Plus,
  UserPlus,
  Crown,
  Shield,
  User,
  Search,
  Mail,
  Calendar,
  Clock,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Filter,
  Download,
  UserCheck,
  UserX,
  MoreVertical,
  Send,
  AlertCircle,
  Lock
} from 'lucide-react';
import { format } from '@/lib/date-format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY: Record<string, number> = {
  'viewer': 1,
  'accountant': 2,
  'manager': 3,
  'admin': 4,
  'owner': 5
};

interface UserData {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'owner' | 'admin' | 'manager' | 'accountant' | 'viewer' | null;
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  last_login: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  department?: string | null;
}

function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<{ role: string; loading: boolean }>({ role: 'viewer', loading: true });

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user?.profile?.role) {
            setCurrentUser({ role: data.user.profile.role, loading: false });
          } else {
            setCurrentUser({ role: 'viewer', loading: false });
          }
        } else {
          setCurrentUser({ role: 'viewer', loading: false });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setCurrentUser({ role: 'viewer', loading: false });
      }
    }
    fetchCurrentUser();
  }, []);

  return currentUser;
}

function useUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return { users, loading, setUsers };
}

export default function UsersPage() {
  const { users, loading, setUsers } = useUsers();
  const currentUser = useCurrentUser();
  const { 
    plan, 
    canAddUser, 
    userLimitBanner, 
    internalUserCount,
    remainingUserSlots,
    refresh: refreshPlan 
  } = usePlan();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserData | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    phone: ''
  });

  // Check if user can invite more users based on plan limits
  const canInviteUser = canAddUser();
  
  // Count internal (billable) users for display
  const billableUserCount = users.filter(u => 
    BILLABLE_ROLES.includes(u.role || '') && u.status !== 'inactive'
  ).length;

  // Calculate current user's role level (use role directly, not from null check)
  const currentRoleLevel = ROLE_HIERARCHY[currentUser.role] || 0;
  const canManageUsers = currentRoleLevel >= ROLE_HIERARCHY['admin'];

  // Get available roles that the current user can assign
  const getAvailableRoles = () => {
    if (currentUser.loading) return [];
    
    const allRoles = [
      { value: 'viewer', label: 'Viewer - Read-only access' },
      { value: 'accountant', label: 'Accountant - Financial management' },
      { value: 'manager', label: 'Manager - Operational tasks' },
      { value: 'admin', label: 'Admin - Manage operations' },
      { value: 'owner', label: 'Owner - Full access' },
    ];

    // Owners can assign any role
    if (currentUser.role === 'owner') {
      return allRoles;
    }

    // Admins can assign roles below admin
    if (currentUser.role === 'admin') {
      return allRoles.filter(role => ROLE_HIERARCHY[role.value] < ROLE_HIERARCHY['admin']);
    }

    // Others can only assign roles below their level
    return allRoles.filter(role => ROLE_HIERARCHY[role.value] < currentRoleLevel);
  };

  // Check if current user can edit a specific user
  const canEditUser = (targetUser: UserData) => {
    if (currentUser.loading) return false;
    if (currentUser.role === 'owner') return true;
    if (!canManageUsers) return false;
    
    const targetRoleLevel = ROLE_HIERARCHY[targetUser.role || 'viewer'] || 0;
    return targetRoleLevel < currentRoleLevel;
  };

  // Check if current user can remove a specific user (only owners)
  const canRemoveUser = (targetUser: UserData) => {
    if (currentUser.loading) return false;
    if (currentUser.role !== 'owner') return false;
    // Can't remove yourself
    return targetUser.status !== 'inactive'; // Can only remove active/pending users
  };

  // Handle remove user
  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    // Store previous state for rollback
    const previousUser = users.find(u => u.id === userToRemove.id);
    
    // Optimistically update - set user to inactive immediately
    setUsers(prev => prev.map(u => 
      u.id === userToRemove.id ? { ...u, status: 'inactive' as const } : u
    ));
    
    // Close modal immediately
    setIsRemoveModalOpen(false);
    toast.success(`${userToRemove.full_name || userToRemove.email} has been removed`);
    const removedUser = userToRemove;
    setUserToRemove(null);
    
    try {
      const response = await fetch(`/api/users/${removedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user');
      }
    } catch (error: any) {
      console.error('Error removing user:', error);
      // Rollback on error
      if (previousUser) {
        setUsers(prev => prev.map(u => 
          u.id === removedUser.id ? previousUser : u
        ));
      }
      toast.error(error.message || 'Failed to remove user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesTab = selectedTab === 'all' || user.status === selectedTab;
    
    return matchesSearch && matchesRole && matchesStatus && matchesTab;
  });

  const roleCounts = users.reduce((acc, user) => {
    const role = user.role || 'viewer';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = users.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getRoleConfig = (role: string | null) => {
    const configs = {
      owner: { icon: Crown, color: 'text-purple-600 bg-purple-50 border-purple-200', label: 'Owner' },
      admin: { icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Admin' },
      manager: { icon: Users, color: 'text-green-600 bg-green-50 border-green-200', label: 'Manager' },
      accountant: { icon: Settings, color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Accountant' },
      viewer: { icon: Eye, color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Viewer' }
    };
    return configs[(role as keyof typeof configs) || 'viewer'] || configs.viewer;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { color: 'text-green-600 bg-green-50 border-green-200', label: 'Active' },
      pending: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Pending' },
      inactive: { color: 'text-red-600 bg-red-50 border-red-200', label: 'Inactive' }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    
    try {
      if (selectedUser) {
        // Update existing user
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.name,
            role: formData.role,
            department: formData.department,
            phone: formData.phone
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update user');
        }

        const updatedUser = await response.json();
        
        // Update local state
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
        toast.success('User updated successfully!');
        
        setFormData({ name: '', email: '', role: '', department: '', phone: '' });
        setSelectedUser(null);
        setIsModalOpen(false);
      } else {
        // Create new user (invite) - Call the API to send invitation
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            role: formData.role,
            full_name: formData.name,
            department: formData.department,
            phone: formData.phone
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send invitation');
        }

        const result = await response.json();
        
        // Add pending user to local state for immediate UI feedback
        const newUser: UserData = {
          id: result.invitation?.id || Date.now().toString(),
          full_name: formData.name,
          email: formData.email,
          role: formData.role as any,
          status: 'pending',
          created_at: new Date().toISOString(),
          last_login: null,
          department: formData.department,
          phone: formData.phone
        };
        
        setUsers(prev => [...prev, newUser]);
        setFormData({ name: '', email: '', role: '', department: '', phone: '' });
        setIsModalOpen(false);
        toast.success('Invitation sent successfully!');
      }
    } catch (error: any) {
      console.error('Error with user operation:', error);
      toast.error(error.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      name: user.full_name || '',
      email: user.email || '',
      role: user.role || '',
      department: user.department || '',
      phone: user.phone || ''
    });
    setIsModalOpen(true);
  };

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    if (name && typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length > 0) {
        return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
    }
    // Fallback to email
    if (email && typeof email === 'string') {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getDisplayName = (user: UserData) => {
    if (user.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user.email) {
      // Use part before @ as display name
      return user.email.split('@')[0];
    }
    return 'Unknown User';
  };

  if (loading) {
    return (
      <AppLayout title="Users & Roles" description="Manage team members and permissions">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Users & Roles"
      description="Manage team members and permissions"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          {canManageUsers && (
            <Button 
              variant="primary" 
              leftIcon={canInviteUser ? <UserPlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />} 
              onClick={() => {
                if (!canInviteUser) {
                  toast.error(`You've reached the user limit for your plan. Upgrade to Pro for unlimited users.`);
                  return;
                }
                setSelectedUser(null);
                setFormData({ name: '', email: '', role: '', department: '', phone: '' });
                setIsModalOpen(true);
              }}
              disabled={!canInviteUser}
              className={!canInviteUser ? 'opacity-60' : ''}
            >
              Invite User
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* User Limit Banner */}
        {userLimitBanner && (
          <LimitBanner message={userLimitBanner.message} type={userLimitBanner.type} />
        )}
        
        {/* Stats Grid */}
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={users.length.toString()}
            icon={Users}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            badge={remainingUserSlots !== Infinity ? `${remainingUserSlots} left` : undefined}
            badgeColor="text-blue-600"
          />

          <StatCard
            title="Active Users"
            value={(statusCounts.active || 0).toString()}
            icon={UserCheck}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />

          <StatCard
            title="Pending Invites"
            value={(statusCounts.pending || 0).toString()}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
          />

          <StatCard
            title="Admins & Owners"
            value={((roleCounts.admin || 0) + (roleCounts.owner || 0)).toString()}
            icon={Shield}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        {/* Role Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-800">Owner</span>
              </div>
              <div className="text-2xl font-bold text-purple-800">{roleCounts.owner || 0}</div>
              <div className="text-sm text-purple-600">Full system access</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Admin</span>
              </div>
              <div className="text-2xl font-bold text-blue-800">{roleCounts.admin || 0}</div>
              <div className="text-sm text-blue-600">Manage operations</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Manager</span>
              </div>
              <div className="text-2xl font-bold text-green-800">{roleCounts.manager || 0}</div>
              <div className="text-sm text-green-600">Operational tasks</div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">Accountant</span>
              </div>
              <div className="text-2xl font-bold text-orange-800">{roleCounts.accountant || 0}</div>
              <div className="text-sm text-orange-600">Financial focus</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-800">Viewer</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{roleCounts.viewer || 0}</div>
              <div className="text-sm text-gray-600">Read-only access</div>
            </div>
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
                    placeholder="Search users by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
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
                { key: 'all', label: 'All Users', count: users.length },
                { key: 'active', label: 'Active', count: statusCounts.active || 0 },
                { key: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
                { key: 'inactive', label: 'Inactive', count: statusCounts.inactive || 0 }
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

          {/* User List */}
          <div className="p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500">Try adjusting your filters or invite a new team member.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => {
                  const roleConfig = getRoleConfig(user.role);
                  const statusConfig = getStatusConfig(user.status);
                  const RoleIcon = roleConfig.icon;
                  
                  return (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">{getInitials(user.full_name, user.email)}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{getDisplayName(user)}</h3>
                            <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDetailsModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditUser(user) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canRemoveUser(user) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setUserToRemove(user);
                                setIsRemoveModalOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", roleConfig.color)}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleConfig.label}
                          </div>
                          <div className={cn("px-2 py-1 rounded-full text-xs font-medium border", statusConfig.color)}>
                            {statusConfig.label}
                          </div>
                        </div>

                        {user.department && (
                          <div className="text-sm text-gray-600">
                            <strong>Department:</strong> {user.department}
                          </div>
                        )}

                        {user.phone && (
                          <div className="text-sm text-gray-600">
                            <strong>Phone:</strong> {user.phone}
                          </div>
                        )}

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Joined: {format(new Date(user.created_at), 'MMM dd, yyyy')}</div>
                          <div>Last active: {user.last_login ? format(new Date(user.last_login), 'MMM dd, yyyy') : 'Never'}</div>
                        </div>

                        {user.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="w-full"
                            leftIcon={<Send className="w-4 h-4" />}
                          >
                            Resend Invite
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Invite/Edit User Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedUser ? 'Edit User' : 'Invite User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={currentUser.loading}
                  >
                    <option value="">Select role</option>
                    {getAvailableRoles().map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  {!currentUser.loading && getAvailableRoles().length === 0 && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      You don&apos;t have permission to invite users
                    </p>
                  )}
                  {currentUser.loading && (
                    <p className="text-xs text-gray-400 mt-1">Loading permissions...</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  <div className="font-medium mb-1">What happens next:</div>
                  <ul className="text-xs space-y-1">
                    <li>• User will receive an invitation email</li>
                    <li>• They can set up their account and password</li>
                    <li>• Access will be granted based on selected role</li>
                  </ul>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedUser(null);
                      setFormData({ name: '', email: '', role: '', department: '', phone: '' });
                    }}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                    {submitting ? 'Saving...' : (selectedUser ? 'Update User' : 'Send Invitation')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {isDetailsModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">{getInitials(selectedUser.full_name, selectedUser.email)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{getDisplayName(selectedUser)}</h3>
                    <p className="text-gray-600">{selectedUser.email || 'No email'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role:</span>
                  <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium", getRoleConfig(selectedUser.role).color)}>
                    {getRoleConfig(selectedUser.role).icon && React.createElement(getRoleConfig(selectedUser.role).icon, { className: "w-3.5 h-3.5" })}
                    {getRoleConfig(selectedUser.role).label}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className={cn("px-2 py-1 rounded-full text-xs font-medium border", getStatusConfig(selectedUser.status).color)}>
                    {getStatusConfig(selectedUser.status).label}
                  </div>
                </div>

                {selectedUser.department && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="text-sm font-medium">{selectedUser.department}</span>
                  </div>
                )}

                {selectedUser.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">{selectedUser.phone}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Joined:</span>
                  <span className="text-sm font-medium">{format(new Date(selectedUser.created_at), 'MMM dd, yyyy')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Active:</span>
                  <span className="text-sm font-medium">{selectedUser.last_login ? format(new Date(selectedUser.last_login), 'MMM dd, yyyy') : 'Never'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-6">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {canRemoveUser(selectedUser) && (
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setUserToRemove(selectedUser);
                      setIsRemoveModalOpen(true);
                    }}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Remove
                  </Button>
                )}
                {canEditUser(selectedUser) && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleEditUser(selectedUser);
                    }}
                    className="flex-1"
                    leftIcon={<Edit className="w-4 h-4" />}
                  >
                    Edit User
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remove User Confirmation Modal */}
        {isRemoveModalOpen && userToRemove && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Remove User</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {getInitials(userToRemove.full_name, userToRemove.email)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getDisplayName(userToRemove)}</p>
                    <p className="text-sm text-gray-500">{userToRemove.email}</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-6">
                <p className="mb-2">Removing this user will:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Set their status to inactive</li>
                  <li>Revoke all access to your company</li>
                  <li>Reduce your billing seat count</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsRemoveModalOpen(false);
                    setUserToRemove(null);
                  }}
                  className="flex-1"
                  disabled={isRemoving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleRemoveUser}
                  disabled={isRemoving}
                  leftIcon={isRemoving ? undefined : <Trash2 className="w-4 h-4" />}
                >
                  {isRemoving ? 'Removing...' : 'Remove User'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}