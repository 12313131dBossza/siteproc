import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client with service role for admin operations
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Server-side Supabase client with user context
export async function createServerSupabaseUserClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// Get current user profile with company and role info
export async function getCurrentUserProfile() {
  const supabase = await createServerSupabaseUserClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { user: null, profile: null, supabase, error: 'Not authenticated' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      company_id,
      role,
      full_name,
      company:companies(id, name)
    `)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { user, profile: null, supabase, error: 'Profile not found' };
  }

  // Add email from auth user to profile
  const profileWithEmail = {
    ...profile,
    email: user.email
  };

  return { user, profile: profileWithEmail, supabase, error: null };
}

// Validate user has required role
export function validateRole(profile: any, requiredRole: 'admin' | 'member') {
  if (requiredRole === 'admin' && profile.role !== 'admin') {
    return false;
  }
  return true;
}

// Activity logging utility
export async function logActivity(
  companyId: string,
  actorId: string | null,
  entityType: 'order' | 'expense' | 'delivery' | 'project',
  entityId: string,
  action: string,
  meta: Record<string, any> = {}
) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      company_id: companyId,
      actor_id: actorId,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      meta: meta
    });

  if (error) {
    console.error('Failed to log activity:', error);
  }
}

// Get project summary with computed metrics
export async function getProjectSummary(projectId: string, companyId: string) {
  const supabase = createServerSupabaseClient();

  // Get project basic info
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, budget, status')
    .eq('id', projectId)
    .eq('company_id', companyId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found');
  }

  // Get approved expenses total (actual spend)
  const { data: expenseResult } = await supabase
    .from('expenses')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'approved');

  const actual = expenseResult?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  const variance = parseFloat(project.budget) - actual;

  // Get detailed counts for orders
  const { data: orders } = await supabase
    .from('orders')
    .select('status')
    .eq('project_id', projectId);

  const totalOrders = orders?.length || 0;
  const approvedOrders = orders?.filter(o => o.status === 'approved').length || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const rejectedOrders = orders?.filter(o => o.status === 'rejected').length || 0;

  // Get detailed counts for expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('status, amount')
    .eq('project_id', projectId);

  const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  const approvedExpenses = expenses?.filter(e => e.status === 'approved').reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  const pendingExpenses = expenses?.filter(e => e.status === 'pending').reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;

  // Get detailed counts for deliveries
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('status')
    .eq('project_id', projectId);

  const totalDeliveries = deliveries?.length || 0;
  const completedDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
  const pendingDeliveries = deliveries?.filter(d => d.status === 'in_transit' || d.status === 'pending').length || 0;

  return {
    id: project.id,
    name: project.name,
    budget: parseFloat(project.budget),
    actual,
    variance,
    status: project.status,
    counts: {
      orders: totalOrders,
      expenses: expenses?.length || 0,
      deliveries: totalDeliveries
    },
    // Additional properties expected by API routes
    totalOrders,
    approvedOrders,
    pendingOrders,
    rejectedOrders,
    totalExpenses,
    approvedExpenses,
    pendingExpenses,
    totalDeliveries,
    completedDeliveries,
    pendingDeliveries,
    totalSpent: actual,
    budgetRemaining: parseFloat(project.budget) - actual,
    budgetUsedPercent: parseFloat(project.budget) > 0 ? (actual / parseFloat(project.budget)) * 100 : 0
  };
}

// Check if project is archived (prevents assignments)
export async function isProjectArchived(projectId: string, companyId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .eq('company_id', companyId)
    .single();

  return project?.status === 'Archived';
}

// Get company admin emails for notifications
export async function getCompanyAdminEmails(companyId: string) {
  const supabase = createServerSupabaseClient();
  // First get admin profile IDs for the company
  const { data: admins, error: adminsErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'admin');

  if (adminsErr || !admins?.length) return [];

  // Use auth.admin to list users and match by id to get email
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return [];
    const adminIds = new Set(admins.map(a => a.id as string));
    const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    return users
      .filter(u => adminIds.has(u.id) && !!u.email)
      .map(u => u.email!)
  } catch {
    return [];
  }
}

// Standard API response helpers
export function successResponse(data: any, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function errorResponse(code: string, message: string, status = 400) {
  return Response.json({ ok: false, code, message }, { status });
}

// Response helper object for legacy API compatibility
export const response = {
  success: (data: any, status = 200) => successResponse(data, status),
  error: (message: string, status = 500) => errorResponse('INTERNAL_ERROR', message, status)
};

// Database transaction helper
export async function withTransaction<T>(
  operation: (supabase: any) => Promise<T>
): Promise<T> {
  const supabase = createServerSupabaseClient();
  
  try {
    const result = await operation(supabase);
    return result;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}