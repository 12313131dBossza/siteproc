'use client'
import { useState, useEffect, useRef } from 'react'
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
  CreditCard,
  Upload,
  Crown,
  Image as ImageIcon,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getCurrencyOptions } from '@/lib/currencies'
import { useCurrency } from '@/lib/CurrencyContext'
import { useWhiteLabel } from '@/lib/WhiteLabelContext'

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
  const [currency, setCurrencyState] = useState('USD')
  const [units, setUnits] = useState('imperial')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setCurrency: setGlobalCurrency } = useCurrency()
  const { config: whiteLabelConfig, canUseWhiteLabel, isEnterprise, refresh: refreshWhiteLabel } = useWhiteLabel()
  
  // White-label state
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false)
  const [whiteLabelLogoUrl, setWhiteLabelLogoUrl] = useState('')
  const [whiteLabelCompanyName, setWhiteLabelCompanyName] = useState('')
  const [whiteLabelEmailName, setWhiteLabelEmailName] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [plan, setPlan] = useState('free')
  const logoInputRef = useRef<HTMLInputElement>(null)
  
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
          setCurrencyState(d.currency || 'USD')
          setUnits(d.units || 'imperial')
          // Load white-label settings
          setPlan(d.plan || 'free')
          setWhiteLabelEnabled(d.white_label_enabled || false)
          setWhiteLabelLogoUrl(d.white_label_logo_url || '')
          setWhiteLabelCompanyName(d.white_label_company_name || '')
          setWhiteLabelEmailName(d.white_label_email_name || false)
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
  
  // Alias for the local state setter
  const setCurrency = (value: string) => setCurrencyState(value)
  
  async function save() {
    setSaving(true)
    try {
      // Use the base /api/companies endpoint which updates the user's company automatically
      const res = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          currency, 
          units,
          // White-label settings (only save if enterprise)
          white_label_enabled: isEnterprise ? whiteLabelEnabled : false,
          white_label_logo_url: isEnterprise ? whiteLabelLogoUrl : null,
          white_label_company_name: isEnterprise ? whiteLabelCompanyName : null,
          white_label_email_name: isEnterprise ? whiteLabelEmailName : false,
        })
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (res.ok) {
        // Re-fetch to confirm the save worked and update UI with actual DB values
        const verifyRes = await fetch('/api/companies')
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          setName(verifyData.name || '')
          setCurrencyState(verifyData.currency || 'USD')
          setUnits(verifyData.units || 'metric')
          
          // Update white-label state
          setWhiteLabelEnabled(verifyData.white_label_enabled || false)
          setWhiteLabelLogoUrl(verifyData.white_label_logo_url || '')
          setWhiteLabelCompanyName(verifyData.white_label_company_name || '')
          setWhiteLabelEmailName(verifyData.white_label_email_name || false)
          
          // Update the global currency context so all pages show the new currency
          setGlobalCurrency(verifyData.currency || 'USD')
          
          // Refresh white-label context so all pages update
          await refreshWhiteLabel()
          
          if (data.warning) {
            toast.success('Settings saved. Note: ' + data.warning)
          } else {
            toast.success('Company settings saved successfully!')
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
  
  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB')
      return
    }
    
    setUploadingLogo(true)
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'white-label-logo')
      
      // Upload to our upload endpoint
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await res.json()
      
      if (res.ok && data.url) {
        setWhiteLabelLogoUrl(data.url)
        toast.success('Logo uploaded successfully')
      } else {
        toast.error(data.error || 'Failed to upload logo')
      }
    } catch (err) {
      console.error('Logo upload error:', err)
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
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

        {/* White-Label Branding Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">White-Label Branding</h3>
            {isEnterprise ? (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                Enterprise
              </span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Enterprise Only
              </span>
            )}
          </div>
          
          {!isEnterprise ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Crown className="h-8 w-8 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Upgrade to Enterprise</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    White-label branding is available for Enterprise customers ($149+/month). 
                    Make SiteProc feel like your own private app with your logo, company name, 
                    and branded emails.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Your logo in the app & login screen
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Your company name in browser tab & headers
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Branded PDF reports & invoices
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Custom email notification sender name
                    </li>
                  </ul>
                  <Link href="/settings/billing">
                    <Button variant="primary" size="sm">
                      Upgrade to Enterprise
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enable White-Label */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whiteLabelEnabled}
                  onChange={(e) => setWhiteLabelEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Enable white-label branding</span>
                  <p className="text-sm text-gray-500">
                    Replace SiteProc branding with your company's logo and name throughout the app
                  </p>
                </div>
              </label>
              
              {whiteLabelEnabled && (
                <div className="ml-7 space-y-4 pt-2">
                  {/* Company Name for Branding */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Company Name (for branding)
                    </label>
                    <Input
                      placeholder="e.g., Acme Builders"
                      value={whiteLabelCompanyName}
                      onChange={(e) => setWhiteLabelCompanyName(e.target.value)}
                      fullWidth
                    />
                    <p className="text-xs text-gray-500">
                      This name will appear in the browser tab, dashboard header, and login screen
                    </p>
                  </div>
                  
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Company Logo
                    </label>
                    <div className="flex items-start gap-4">
                      {whiteLabelLogoUrl ? (
                        <div className="relative">
                          <img 
                            src={whiteLabelLogoUrl} 
                            alt="Company logo" 
                            className="h-16 w-auto max-w-[200px] object-contain rounded-lg border border-gray-200 bg-white p-2"
                          />
                          <button
                            type="button"
                            onClick={() => setWhiteLabelLogoUrl('')}
                            className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => logoInputRef.current?.click()}
                          className="flex items-center justify-center h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          {uploadingLogo ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="h-6 w-6 text-gray-400 mx-auto" />
                              <span className="text-xs text-gray-500">Upload</span>
                            </div>
                          )}
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {!whiteLabelLogoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          leftIcon={<Upload className="h-4 w-4" />}
                        >
                          {uploadingLogo ? 'Uploading...' : 'Choose File'}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG or JPG, max 2MB. Recommended: transparent background, 400x100px
                    </p>
                  </div>
                  
                  {/* Use Company Name in Emails */}
                  <label className="flex items-start gap-3 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={whiteLabelEmailName}
                      onChange={(e) => setWhiteLabelEmailName(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Use company name in email notifications</span>
                      <p className="text-sm text-gray-500">
                        Emails will be sent as "{whiteLabelCompanyName || 'Your Company'} &lt;notifications@siteproc.com&gt;"
                      </p>
                    </div>
                  </label>
                  
                  {/* Preview */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-32">Browser Tab:</span>
                        <span className="font-medium">{whiteLabelCompanyName || 'Your Company'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-32">Dashboard:</span>
                        <span className="font-medium">{whiteLabelCompanyName || 'Your Company'} Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-32">Login Screen:</span>
                        <span className="font-medium">Welcome back to {whiteLabelCompanyName || 'Your Company'}</span>
                      </div>
                      {whiteLabelEmailName && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-32">Email From:</span>
                          <span className="font-medium">{whiteLabelCompanyName || 'Your Company'} &lt;notifications@siteproc.com&gt;</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
  const [zohoStatus, setZohoStatus] = useState<'disconnected' | 'connected' | 'loading'>('loading')
  const [zohoCompany, setZohoCompany] = useState<string | null>(null)

  useEffect(() => {
    checkZohoStatus()
  }, [])

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
