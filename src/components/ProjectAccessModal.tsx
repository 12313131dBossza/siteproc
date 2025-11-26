"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
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
  view_orders: true,
  view_expenses: false,
  view_payments: false,
  view_documents: true,
  edit_project: false,
  create_orders: false,
  upload_documents: false,
  invite_others: false,
};

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

      if (!res.ok) throw new Error('Failed to update');

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: role as any } : m));
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
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

  return (
    <Modal open={isOpen} onClose={onClose} title="">
      <div className="min-w-[500px] max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Project Access</h2>
            <p className="text-sm text-gray-500 mt-1">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'members' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4 inline-block mr-2" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'settings' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="h-4 w-4 inline-block mr-2" />
            Settings
          </button>
        </div>

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
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Invite Member</span>
                  </button>
                ) : (
                  /* Invite Form */
                  <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Invite Member</h3>
                      <button onClick={() => { setShowInviteForm(false); resetInviteForm(); }}>
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>

                    {/* Invite Type Toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInviteType('internal')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          inviteType === 'internal'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Users className="h-4 w-4 inline-block mr-2" />
                        Team Member
                      </button>
                      <button
                        onClick={() => setInviteType('external')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          inviteType === 'external'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <ExternalLink className="h-4 w-4 inline-block mr-2" />
                        External
                      </button>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={inviteType === 'internal' ? 'colleague@company.com' : 'client@theircompany.com'}
                        leftIcon={<Mail className="h-4 w-4" />}
                        fullWidth
                      />
                    </div>

                    {/* External-only fields */}
                    {inviteType === 'external' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <Input
                              value={inviteName}
                              onChange={(e) => setInviteName(e.target.value)}
                              placeholder="John Doe"
                              fullWidth
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                            <Input
                              value={inviteCompany}
                              onChange={(e) => setInviteCompany(e.target.value)}
                              placeholder="Their Company"
                              fullWidth
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <Select
                            value={inviteExternalType}
                            onChange={(e) => setInviteExternalType(e.target.value)}
                            options={EXTERNAL_TYPE_OPTIONS}
                          />
                        </div>
                      </>
                    )}

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <Select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        options={ROLE_OPTIONS.map(r => ({ value: r.value, label: r.label }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {ROLE_OPTIONS.find(r => r.value === inviteRole)?.description}
                      </p>
                    </div>

                    {/* Permissions (for external/collaborator) */}
                    {inviteType === 'external' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(invitePermissions).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => setInvitePermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-gray-700">{key.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => { setShowInviteForm(false); resetInviteForm(); }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleInvite}
                        disabled={saving || !inviteEmail}
                        className="flex-1"
                      >
                        {saving ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No members yet</p>
                      <p className="text-sm">Invite team members or external collaborators</p>
                    </div>
                  ) : (
                    members.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                            {member.external_email ? (
                              <Building2 className="h-5 w-5" />
                            ) : (
                              (member.profiles?.full_name?.[0] || member.external_name?.[0] || '?').toUpperCase()
                            )}
                          </div>
                          
                          {/* Info */}
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.profiles?.full_name || member.external_name || 'Unknown'}
                              {member.external_company && (
                                <span className="text-gray-500 font-normal ml-1">
                                  @ {member.external_company}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.profiles?.email || member.external_email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Status */}
                          {getStatusBadge(member.status)}
                          
                          {/* Role */}
                          {member.role !== 'owner' ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleColor(member.role)}`}
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

                          {/* Remove */}
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Project Visibility</h3>
                  <div className="space-y-2">
                    {VISIBILITY_OPTIONS.map(option => {
                      const Icon = option.icon;
                      const isSelected = settings.visibility === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleUpdateVisibility(option.value)}
                          disabled={saving}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
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
                  <h3 className="text-sm font-medium text-gray-900 mb-3">External Sharing</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
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

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
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
    </Modal>
  );
}

export default ProjectAccessModal;
