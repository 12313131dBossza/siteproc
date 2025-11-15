'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui"
import { 
  Building2, 
  Users, 
  Package, 
  Code, 
  Save, 
  UserPlus,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Package },
  { id: 'cost-codes', label: 'Cost Codes', icon: Code }
] as const

type TabId = typeof TABS[number]['id']

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('company')
  
  return (
    <AppLayout title="Settings">
      <div className="space-y-4">
        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <nav className="flex border-b border-gray-200 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    tab === t.id
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
          </nav>

          {/* Tab Content */}
          <div className="p-6">
            {tab === 'company' && <CompanyTab />}
            {tab === 'users' && <UsersTab />}
            {tab === 'suppliers' && <SuppliersTab />}
            {tab === 'cost-codes' && <CostCodesTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function CompanyTab() {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [units, setUnits] = useState('imperial')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const companyId = (typeof window !== 'undefined' ? (localStorage.getItem('company_id') || '') : '') || process.env.NEXT_PUBLIC_COMPANY_ID || ''
  
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) return
      setLoading(true)
      try {
        const r = await fetch('/api/companies/' + companyId)
        const d = await r.json().catch(() => null)
        if (d) {
          setName(d.name || '')
          setCurrency(d.currency || 'USD')
          setUnits(d.units || 'imperial')
        }
      } catch (error) {
        console.error('Failed to load company:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCompany()
  }, [companyId])
  
  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/companies/' + companyId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, currency, units })
      })
      
      if (res.ok) {
        toast.success('Company settings saved successfully')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company settings...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Company Name *
          </label>
          <Input
            placeholder="Enter company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <Input
              placeholder="USD"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              fullWidth
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Unit System
            </label>
            <Select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              options={[
                { value: 'imperial', label: 'Imperial' },
                { value: 'metric', label: 'Metric' }
              ]}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={save}
            disabled={saving || !name}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setName('')
              setCurrency('USD')
              setUnits('imperial')
            }}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('foreman')
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/users')
        const d = await r.json().catch(() => [])
        setUsers(Array.isArray(d) ? d : [])
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [])
  
  async function invite() {
    if (!email) {
      toast.error('Please enter an email address')
      return
    }
    
    setInviting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, role })
      })
      
      if (res.ok) {
        const d = await res.json().catch(() => null)
        setUsers(u => [...(u || []), d])
        setEmail('')
        toast.success('User invitation sent successfully')
      } else {
        toast.error('Failed to invite user')
      }
    } catch (error) {
      console.error('Invite error:', error)
      toast.error('Failed to invite user')
    } finally {
      setInviting(false)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Invite User Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserPlus className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Invite New User</h4>
            <p className="text-sm text-gray-600">Send an invitation to join your team</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              fullWidth
            />
          </div>
          <div>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'foreman', label: 'Foreman' },
                { value: 'bookkeeper', label: 'Bookkeeper' },
                { value: 'admin', label: 'Admin' },
                { value: 'owner', label: 'Owner' }
              ]}
            />
          </div>
        </div>
        
        <div className="mt-3">
          <Button
            variant="primary"
            onClick={invite}
            disabled={inviting || !email}
            leftIcon={<UserPlus className="h-4 w-4" />}
            size="sm"
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Team Members ({users.length})</h4>
        
        {loading ? (
          <div className="flex items-center justify-center py-12 border border-gray-200 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-lg">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
            <p className="text-gray-500">Invite your first team member to get started</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {u.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900 capitalize">{u.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SuppliersTab() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Manage Suppliers</h4>
            <p className="text-sm text-gray-600 mb-3">
              Use the dedicated Suppliers page to add, edit, and manage all your vendors and suppliers in one place.
            </p>
            <Link href="/suppliers">
              <Button variant="primary" size="sm">
                Go to Suppliers Page
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CostCodesTab() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Code className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Project Cost Codes</h4>
            <p className="text-sm text-gray-600 mb-3">
              Cost codes are automatically created and managed within individual project dashboards. 
              They help you categorize and track expenses by type, making reporting and analysis easier.
            </p>
            <Link href="/projects">
              <Button variant="primary" size="sm">
                View Projects
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex gap-3 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">1</span>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Create in Projects</h5>
            <p className="text-sm text-gray-600">
              Cost codes are defined at the project level, allowing you to customize them based on project needs.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">2</span>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Track Expenses</h5>
            <p className="text-sm text-gray-600">
              Link expenses to specific cost codes for detailed budget tracking and analysis.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">3</span>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Generate Reports</h5>
            <p className="text-sm text-gray-600">
              Cost codes appear in exports and reports, giving you clear visibility into where money is being spent.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
