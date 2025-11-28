"use client";

// Project Access Modal - Manages team members and permissions
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Users, 
  Globe, 
  Lock, 
  UserPlus, 
  Mail, 
  Building2, 
  Trash2, 
  Eye, 
  Edit, 
  Shield,
  Check,
  X,
  Copy,
  ExternalLink,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface ProjectMember {
  id: string;
  project_id: string;
  user_id?: string;
  external_email?: string;
  external_name?: string;
  external_company?: string;
  external_type?: string;
  role: 'owner' | 'manager' | 'editor' | 'viewer' | 'collaborator';
  permissions: Record<string, boolean>;
  status: 'pending' | 'active' | 'revoked' | 'expired';
  invited_by?: string;
  created_at: string;
  // Joined data
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface ProjectSettings {
  id: string;
  project_id: string;
  visibility: 'private' | 'company' | 'team';
  allow_external_sharing: boolean;
  require_approval_for_external: boolean;
  default_member_permissions: Record<string, boolean>;
}

interface Props {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager', description: 'Can edit project and manage members' },
  { value: 'editor', label: 'Editor', description: 'Can edit project content' },
  { value: 'viewer', label: 'Viewer', description: 'Can view project only' },
  { value: 'collaborator', label: 'Collaborator', description: 'External access with custom permissions' },
];

const EXTERNAL_TYPE_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { 
    value: 'company', 
    label: 'Company', 
    description: 'All company members can see this project',
    icon: Building2,
    color: 'text-blue-600 bg-blue-50'
  },
  { 
    value: 'team', 
    label: 'Team Only', 
    description: 'Only assigned team members can see this project',
    icon: Users,
    color: 'text-purple-600 bg-purple-50'
  },
  { 
    value: 'private', 
    label: 'Private', 
    description: 'Only you and invited members can see this project',
    icon: Lock,
    color: 'text-gray-600 bg-gray-50'
  },
];

const DEFAULT_PERMISSIONS = {
  view_project: true,
  edit_project: false,
  view_orders: true,
  create_orders: false,
  view_expenses: false,
  view_payments: false,
  view_documents: true,
  upload_documents: false,
  view_timeline: true,
  view_photos: true,
  use_chat: true,
  view_deliveries: false,
  manage_deliveries: false,
  invite_others: false,
};

// Permission display names for better readability
const PERMISSION_LABELS: Record<string, string> = {
  view_project: 'View Project',
  edit_project: 'Edit Project',
  view_orders: 'View Orders',
  create_orders: 'Create Orders',
  view_expenses: 'View Expenses',
  view_payments: 'View Payments',
  view_documents: 'View Documents',
  upload_documents: 'Upload Documents',
  view_timeline: 'View Timeline',
  view_photos: 'View Photos',
  use_chat: 'Use Chat',
  view_deliveries: 'View Deliveries',
  manage_deliveries: 'Manage Deliveries',
  invite_others: 'Invite Others',
};

// Get external type badge styling
function getExternalTypeBadge(type: string | undefined) {
  switch (type) {
    case 'supplier': 
      return { label: 'Supplier', className: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'client': 
      return { label: 'Client', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'contractor': 
      return { label: 'Contractor', className: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'consultant': 
      return { label: 'Consultant', className: 'bg-teal-100 text-teal-700 border-teal-200' };
    default: 
      return null;
  }
}

// Check if member is from the company (internal) vs external
function getMemberTypeLabel(member: ProjectMember) {
  // If they have external_type set, show that
  if (member.external_type && member.external_type !== 'other') {
    return getExternalTypeBadge(member.external_type);
  }
  // If they have external_email but accepted (now have user_id), still show as external type
  if (member.external_email || member.external_company) {
    return { label: 'External', className: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
  // Internal company member
  return { label: 'Company', className: 'bg-green-100 text-green-700 border-green-200' };
}

export function ProjectAccessModal({ projectId, projectName, isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'members' | 'settings'>('members');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteType, setInviteType] = useState<'internal' | 'external'>('internal');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');
  const [inviteExternalType, setInviteExternalType] = useState('client');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [invitePermissions, setInvitePermissions] = useState(DEFAULT_PERMISSIONS);
  
  // Edit permissions state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);

  // Load data
  useEffect(() => {
    if (isOpen && projectId) {
      loadData();
    }
  }, [isOpen, projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [membersRes, settingsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`),
        fetch(`/api/projects/${projectId}/settings`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || data || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings || data);
      }
    } catch (error) {
      console.error('Failed to load project access data:', error);
      toast.error('Failed to load access settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      const payload = inviteType === 'internal' 
        ? { email: inviteEmail, role: inviteRole }
        : {
            external_email: inviteEmail,
            external_name: inviteName,
            external_company: inviteCompany,
            external_type: inviteExternalType,
            role: inviteRole,
            permissions: invitePermissions,
          };

      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to invite');
      }

      toast.success('Invitation sent successfully!');
      setShowInviteForm(false);
      resetInviteForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateVisibility(visibility: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setSettings(prev => prev ? { ...prev, visibility: visibility as any } : null);
      toast.success('Visibility updated');
    } catch (error) {
      toast.error('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove');

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  }

  async function handleUpdateMemberRole(memberId: string, role: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update');
      }

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: role as any } : m));
      toast.success('Role updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  }

  function startEditingPermissions(member: ProjectMember) {
    setEditingMemberId(member.id);
    setEditingPermissions(member.permissions || DEFAULT_PERMISSIONS);
  }

  function cancelEditingPermissions() {
    setEditingMemberId(null);
    setEditingPermissions(DEFAULT_PERMISSIONS);
  }

  async function savePermissions(memberId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update');
      }

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions: editingPermissions } : m));
      setEditingMemberId(null);
      toast.success('Permissions updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  }

  function resetInviteForm() {
    setInviteEmail('');
    setInviteName('');
    setInviteCompany('');
    setInviteExternalType('client');
    setInviteRole('viewer');
    setInvitePermissions(DEFAULT_PERMISSIONS);
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'editor': return 'bg-green-100 text-green-700 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'collaborator': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active': return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>;
      case 'pending': return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'revoked': return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Revoked</span>;
      default: return null;
    }
  }

  // Prevent body scroll when modal is open - MUST be before any conditional returns
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999]"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        height: '100dvh',
        minHeight: '-webkit-fill-available'
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div 
        className="relative h-full flex flex-col md:items-center md:justify-center md:p-4"
        style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
      >
        {/* Modal - Full screen on mobile */}
        <div 
          className="relative w-full h-full md:h-auto md:max-h-[85vh] md:max-w-xl bg-white md:rounded-xl shadow-2xl flex flex-col"
          style={{ maxHeight: '100dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-white md:rounded-t-xl">
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Project Access</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate" title={projectName}>
                {projectName}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

        {/* Tabs */}
        <div className="flex border-b px-4 flex-shrink-0 bg-white">
          <button
            onClick={() => setTab('members')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 md:gap-2 ${
              tab === 'members' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 md:gap-2 ${
              tab === 'settings' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-4 overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Members Tab */}
              {tab === 'members' && (
                <div className="space-y-4">
                  {/* Invite Button */}
                  {!showInviteForm ? (
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span className="font-medium">Invite Member</span>
                    </button>
                  ) : (
                    /* Invite Form */
                    <div className="p-5 border rounded-xl bg-gray-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Invite Member</h3>
                        <button 
                          onClick={() => { setShowInviteForm(false); resetInviteForm(); }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>

                      {/* Invite Type Toggle */}
                      <div className="flex gap-2 mb-5">
                        <button
                          onClick={() => setInviteType('internal')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            inviteType === 'internal'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          Team Member
                        </button>
                        <button
                          onClick={() => setInviteType('external')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            inviteType === 'external'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <ExternalLink className="h-4 w-4" />
                          External
                        </button>
                      </div>

                      {/* Type Description */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-xs text-blue-700">
                          {inviteType === 'internal' 
                            ? '💡 Team members are existing users from your company who need access to this project.'
                            : '💡 External users are clients, suppliers, or contractors who will receive an email invitation.'
                          }
                        </p>
                      </div>

                      {/* Email Field */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder={inviteType === 'internal' ? 'colleague@yourcompany.com' : 'contact@external.com'}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* External-only fields */}
                      {inviteType === 'external' && (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                              <input
                                type="text"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                              <input
                                type="text"
                                value={inviteCompany}
                                onChange={(e) => setInviteCompany(e.target.value)}
                                placeholder="Company Name"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                            <select
                              value={inviteExternalType}
                              onChange={(e) => setInviteExternalType(e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                              {EXTERNAL_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {/* Role */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1.5">
                          {ROLE_OPTIONS.find(r => r.value === inviteRole)?.description}
                        </p>
                      </div>

                      {/* Permissions (for external) */}
                      {inviteType === 'external' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                            {/* View Permissions */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">View Access</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {['view_project', 'view_orders', 'view_expenses', 'view_payments', 'view_documents', 'view_timeline', 'view_photos', 'view_deliveries'].map(key => (
                                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={invitePermissions[key] || false}
                                      onChange={(e) => setInvitePermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            
                            {/* Edit/Create Permissions */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Edit & Create</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {['edit_project', 'create_orders', 'upload_documents', 'manage_deliveries'].map(key => (
                                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={invitePermissions[key] || false}
                                      onChange={(e) => setInvitePermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            
                            {/* Communication & Other */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Communication & Other</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {['use_chat', 'invite_others'].map(key => (
                                  <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={invitePermissions[key] || false}
                                      onChange={(e) => setInvitePermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submit Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => { setShowInviteForm(false); resetInviteForm(); }}
                          className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleInvite}
                          disabled={saving || !inviteEmail}
                          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? 'Sending...' : 'Send Invitation'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="space-y-3">
                    {members.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-900">No members yet</p>
                        <p className="text-sm text-gray-500 mt-1">Invite team members or external collaborators</p>
                      </div>
                    ) : (
                      members.map(member => (
                        <div
                          key={member.id}
                          className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          {/* Member Header - Stack on mobile */}
                          <div className="p-3">
                            {/* Top row: Avatar + Name + Badges */}
                            <div className="flex items-start gap-3 mb-2">
                              {/* Avatar - Color coded by type */}
                              <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                                member.external_type === 'supplier' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                                member.external_type === 'client' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                member.external_type === 'contractor' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                member.external_email || member.external_company ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                                'bg-gradient-to-br from-green-500 to-green-600'
                              }`}>
                                {(member.profiles?.full_name?.[0] || member.external_name?.[0] || '?').toUpperCase()}
                              </div>
                              
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {member.profiles?.full_name || member.external_name || 'Unknown'}
                                  </span>
                                  {/* Member Type Label */}
                                  {(() => {
                                    const typeInfo = getMemberTypeLabel(member);
                                    if (!typeInfo) return null;
                                    return (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${typeInfo.className}`}>
                                        {typeInfo.label}
                                      </span>
                                    );
                                  })()}
                                  {/* Status */}
                                  {getStatusBadge(member.status)}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {member.profiles?.email || member.external_email}
                                </div>
                                {member.external_company && (
                                  <div className="text-xs text-gray-400 truncate">
                                    @ {member.external_company}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom row: Role + Actions */}
                            <div className="flex items-center justify-between pl-12">
                              {/* Role */}
                              {member.role !== 'owner' ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer ${getRoleColor(member.role)}`}
                                >
                                  {ROLE_OPTIONS.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleColor('owner')}`}>
                                  Owner
                                </span>
                              )}

                              <div className="flex items-center gap-1">
                                {/* Edit Permissions Button */}
                                {member.role !== 'owner' && (
                                  <button
                                    onClick={() => editingMemberId === member.id ? cancelEditingPermissions() : startEditingPermissions(member)}
                                    className={`p-1.5 rounded transition-colors ${
                                      editingMemberId === member.id 
                                        ? 'text-blue-600 bg-blue-50' 
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Edit permissions"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </button>
                                )}

                                {/* Remove */}
                                {member.role !== 'owner' && (
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Permissions Editor (expandable) */}
                          {editingMemberId === member.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Edit Permissions</h4>
                              
                              {/* View Permissions */}
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">View Access</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {['view_project', 'view_orders', 'view_expenses', 'view_payments', 'view_documents', 'view_timeline', 'view_photos', 'view_deliveries'].map(key => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                                      <input
                                        type="checkbox"
                                        checked={editingPermissions[key] || false}
                                        onChange={(e) => setEditingPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Edit/Create Permissions */}
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Edit & Create</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {['edit_project', 'create_orders', 'upload_documents', 'manage_deliveries'].map(key => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                                      <input
                                        type="checkbox"
                                        checked={editingPermissions[key] || false}
                                        onChange={(e) => setEditingPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Communication & Other */}
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Communication & Other</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {['use_chat', 'invite_others'].map(key => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded">
                                      <input
                                        type="checkbox"
                                        checked={editingPermissions[key] || false}
                                        onChange={(e) => setEditingPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[key] || key}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={cancelEditingPermissions}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => savePermissions(member.id)}
                                  disabled={saving}
                                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  {saving ? 'Saving...' : 'Save Permissions'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {tab === 'settings' && settings && (
                <div className="space-y-6">
                  {/* Visibility */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Visibility</h3>
                    <div className="space-y-2">
                      {VISIBILITY_OPTIONS.map(option => {
                        const Icon = option.icon;
                        const isSelected = settings.visibility === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleUpdateVisibility(option.value)}
                            disabled={saving}
                            className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${option.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{option.label}</span>
                                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* External Sharing */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">External Sharing</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-medium text-gray-900">Allow external sharing</div>
                          <div className="text-sm text-gray-500">
                            Allow inviting clients, suppliers, and other external users
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.allow_external_sharing}
                          onChange={async (e) => {
                            const res = await fetch(`/api/projects/${projectId}/settings`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ allow_external_sharing: e.target.checked }),
                            });
                            if (res.ok) {
                              setSettings(prev => prev ? { ...prev, allow_external_sharing: e.target.checked } : null);
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-medium text-gray-900">Require approval</div>
                          <div className="text-sm text-gray-500">
                            External invitations require owner approval
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.require_approval_for_external}
                          onChange={async (e) => {
                            const res = await fetch(`/api/projects/${projectId}/settings`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ require_approval_for_external: e.target.checked }),
                            });
                            if (res.ok) {
                              setSettings(prev => prev ? { ...prev, require_approval_for_external: e.target.checked } : null);
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}

export default ProjectAccessModal;
