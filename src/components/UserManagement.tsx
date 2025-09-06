import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  company_id?: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
  description?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users with their company info
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          full_name,
          company_id,
          companies:company_id (
            id,
            name
          ),
          users:id (
            email
          )
        `);

      if (usersError) throw usersError;

      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, description')
        .order('name');

      if (companiesError) throw companiesError;

      // Transform users data
      const transformedUsers = usersData?.map((user: any) => ({
        id: user.id,
        email: (user.users as any)?.email || 'No email',
        role: user.role,
        full_name: user.full_name,
        company_id: user.company_id,
        company_name: (user.companies as any)?.name || 'No company'
      })) || [];

      setUsers(transformedUsers);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserCompany = async (userId: string, companyId: string, role: string) => {
    setSaving(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          company_id: companyId || null,
          role: role
        })
        .eq('id', userId);

      if (error) throw error;

      // Refresh data
      await fetchData();
      alert('User assignment updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user assignment');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading user data...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Assign users to companies and manage their roles</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assign To Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    companies={companies}
                    onUpdate={updateUserCompany}
                    saving={saving === user.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Role Permissions:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>Admin/Owner:</strong> Can see all expenses, approve/reject, create auto-approved expenses</li>
          <li><strong>Member:</strong> Can create pending expenses, see own expenses only</li>
          <li><strong>Viewer:</strong> Can see approved expenses only (read-only)</li>
        </ul>
      </div>
    </div>
  );
}

interface UserRowProps {
  user: User;
  companies: Company[];
  onUpdate: (userId: string, companyId: string, role: string) => void;
  saving: boolean;
}

function UserRow({ user, companies, onUpdate, saving }: UserRowProps) {
  const [selectedCompany, setSelectedCompany] = useState(user.company_id || '');
  const [selectedRole, setSelectedRole] = useState(user.role || 'viewer');

  const handleUpdate = () => {
    onUpdate(user.id, selectedCompany, selectedRole);
  };

  const hasChanges = selectedCompany !== (user.company_id || '') || selectedRole !== user.role;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {user.full_name || 'Unknown Name'}
          </div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' || user.role === 'owner' 
            ? 'bg-red-100 text-red-800'
            : user.role === 'member'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {user.company_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          disabled={saving}
        >
          <option value="">No company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          disabled={saving}
        >
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button
          onClick={handleUpdate}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            hasChanges && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Update'}
        </button>
      </td>
    </tr>
  );
}
