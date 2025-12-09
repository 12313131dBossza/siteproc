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
  AlertCircle,
  Link2,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getCurrencyOptions } from '@/lib/currencies'

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Package },
  { id: 'cost-codes', label: 'Cost Codes', icon: Code },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'billing', label: 'Billing', icon: CreditCard }
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
            {tab === 'integrations' && <IntegrationsTab />}
            {tab === 'billing' && <BillingTab />}
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const loadCompany = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use the base /api/companies endpoint which gets the user's company automatically
        const r = await fetch('/api/companies')
        const d = await r.json().catch(() => null)
        
        if (!r.ok) {
          setError(d?.error || 'Failed to load company settings')
          return
        }
        
        if (d) {
          setName(d.name || '')
          setCurrency(d.currency || 'USD')
          setUnits(d.units || 'imperial')
        }
      } catch (err) {
        console.error('Failed to load company:', err)
        setError('Failed to load company settings')
      } finally {
        setLoading(false)
      }
    }
    loadCompany()
  }, [])
  
  async function save() {
    setSaving(true)
    try {
      // Use the base /api/companies endpoint which updates the user's company automatically
      const res = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, currency, units })
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (res.ok) {
        // Re-fetch to confirm the save worked and update UI with actual DB values
        const verifyRes = await fetch('/api/companies')
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          setName(verifyData.name || '')
          setCurrency(verifyData.currency || 'USD')
          setUnits(verifyData.units || 'metric')
          
          if (data.warning) {
            toast.success('Settings saved. Note: ' + data.warning)
          } else {
            toast.success('Company settings saved successfully')
          }
        } else {
          toast.success('Settings saved successfully')
        }
      } else {
        toast.error(data.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Save error:', err)
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500">Please make sure you are logged in with a valid account.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Go to Dashboard
          </Link>
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
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={getCurrencyOptions()}
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
  const [role, setRole] = useState('viewer')
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
                { value: 'viewer', label: 'Viewer' },
                { value: 'accountant', label: 'Accountant' },
                { value: 'manager', label: 'Manager' },
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

function IntegrationsTab() {
  const [qbStatus, setQbStatus] = useState<'disconnected' | 'connected' | 'loading'>('loading')
  const [qbCompany, setQbCompany] = useState<string | null>(null)
  const [xeroStatus, setXeroStatus] = useState<'disconnected' | 'connected' | 'loading'>('loading')
  const [xeroCompany, setXeroCompany] = useState<string | null>(null)
  const [zohoStatus, setZohoStatus] = useState<'disconnected' | 'connected' | 'loading'>('loading')
  const [zohoCompany, setZohoCompany] = useState<string | null>(null)

  useEffect(() => {
    checkQuickBooksStatus()
    checkXeroStatus()
    checkZohoStatus()
  }, [])

  async function checkQuickBooksStatus() {
    try {
      const res = await fetch('/api/quickbooks/status')
      const data = await res.json()
      if (data.connected) {
        setQbStatus('connected')
        setQbCompany(data.companyName || 'Connected')
      } else {
        setQbStatus('disconnected')
      }
    } catch {
      setQbStatus('disconnected')
    }
  }

  async function checkXeroStatus() {
    try {
      const res = await fetch('/api/xero/status')
      const data = await res.json()
      if (data.connected) {
        setXeroStatus('connected')
        setXeroCompany(data.tenantName || 'Connected')
      } else {
        setXeroStatus('disconnected')
      }
    } catch {
      setXeroStatus('disconnected')
    }
  }

  async function checkZohoStatus() {
    try {
      const res = await fetch('/api/zoho/status')
      const data = await res.json()
      if (data.connected) {
        setZohoStatus('connected')
        setZohoCompany(data.organizationName || 'Connected')
      } else {
        setZohoStatus('disconnected')
      }
    } catch {
      setZohoStatus('disconnected')
    }
  }

  async function connectQuickBooks() {
    window.location.href = '/api/quickbooks/authorize'
  }

  async function disconnectQuickBooks() {
    try {
      await fetch('/api/quickbooks/disconnect', { method: 'POST' })
      setQbStatus('disconnected')
      setQbCompany(null)
      toast.success('QuickBooks disconnected')
    } catch {
      toast.error('Failed to disconnect QuickBooks')
    }
  }

  async function connectXero() {
    window.location.href = '/api/xero/authorize'
  }

  async function disconnectXero() {
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' })
      setXeroStatus('disconnected')
      setXeroCompany(null)
      toast.success('Xero disconnected')
    } catch {
      toast.error('Failed to disconnect Xero')
    }
  }

  async function connectZoho() {
    window.location.href = '/api/zoho/authorize'
  }

  async function disconnectZoho() {
    try {
      await fetch('/api/zoho/disconnect', { method: 'POST' })
      setZohoStatus('disconnected')
      setZohoCompany(null)
      toast.success('Zoho Books disconnected')
    } catch {
      toast.error('Failed to disconnect Zoho Books')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Integrations</h3>
        <p className="text-sm text-gray-600">Connect third-party services to sync your data</p>
      </div>

      {/* Zoho Books Integration - Recommended (FREE) */}
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded">RECOMMENDED - FREE</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Zoho Books</h4>
              <p className="text-sm text-gray-600 mt-1">
                Free accounting software - sync expenses, invoices, and payments
              </p>
              {zohoStatus === 'connected' && zohoCompany && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected to {zohoCompany}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            {zohoStatus === 'loading' ? (
              <Button variant="ghost" disabled>
                Checking...
              </Button>
            ) : zohoStatus === 'connected' ? (
              <Button variant="ghost" onClick={disconnectZoho}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={connectZoho}>
                Connect
              </Button>
            )}
          </div>
        </div>

        {zohoStatus === 'connected' && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Sync Settings</h5>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Auto-sync expenses</span>
                <span className="text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-sync invoices</span>
                <span className="text-green-600">Enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Xero Integration - Paid */}
      <div className="border border-gray-200 rounded-lg p-6 opacity-75">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-gray-400 text-white text-xs font-semibold px-2 py-1 rounded">PAID SUBSCRIPTION</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Xero</h4>
              <p className="text-sm text-gray-600 mt-1">
                Sync expenses, invoices, and payments with Xero (requires paid Xero account)
              </p>
              {xeroStatus === 'connected' && xeroCompany && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected to {xeroCompany}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            {xeroStatus === 'loading' ? (
              <Button variant="ghost" disabled>
                Checking...
              </Button>
            ) : xeroStatus === 'connected' ? (
              <Button variant="ghost" onClick={disconnectXero}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={connectXero}>
                Connect
              </Button>
            )}
          </div>
        </div>

        {xeroStatus === 'connected' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Sync Settings</h5>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Auto-sync expenses</span>
                <span className="text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-sync invoices</span>
                <span className="text-green-600">Enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QuickBooks Integration */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">QuickBooks Online</h4>
              <p className="text-sm text-gray-600 mt-1">
                Sync expenses, invoices, and payments with QuickBooks
              </p>
              {qbStatus === 'connected' && qbCompany && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected to {qbCompany}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            {qbStatus === 'loading' ? (
              <Button variant="ghost" disabled>
                Checking...
              </Button>
            ) : qbStatus === 'connected' ? (
              <Button variant="ghost" onClick={disconnectQuickBooks}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={connectQuickBooks}>
                Connect
              </Button>
            )}
          </div>
        </div>

        {qbStatus === 'connected' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Sync Settings</h5>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Auto-sync expenses</span>
                <span className="text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-sync invoices</span>
                <span className="text-green-600">Enabled</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BillingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Billing & Subscription</h3>
        <p className="text-sm text-gray-600">Manage your subscription and billing details</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900">Current Plan</h4>
            <p className="text-sm text-gray-600 mt-1">View and manage your subscription</p>
          </div>
          <Link href="/settings/billing">
            <Button>
              Manage Billing
            </Button>
          </Link>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Click "Manage Billing" to view your current plan, upgrade, or manage payment methods.
          </p>
        </div>
      </div>
    </div>
  )
}
