import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile, validateRole, logActivity, getProjectSummary, response } from '@/lib/server-utils'

// GET /api/projects - List projects for user's company
export async function GET() {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    // Get projects for user's company
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        budget,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return response.error('Failed to fetch projects', 500)
    }

    // Get project summaries for each project
    const projectsWithSummary = await Promise.all(
      projects.map(async (project) => {
        const summary = await getProjectSummary(project.id, profile.company_id)
        return {
          ...project,
          summary: {
            totalOrders: summary.totalOrders,
            approvedOrders: summary.approvedOrders,
            pendingOrders: summary.pendingOrders,
            rejectedOrders: summary.rejectedOrders,
            totalExpenses: summary.totalExpenses,
            approvedExpenses: summary.approvedExpenses,
            pendingExpenses: summary.pendingExpenses,
            totalDeliveries: summary.totalDeliveries,
            completedDeliveries: summary.completedDeliveries,
            pendingDeliveries: summary.pendingDeliveries,
            totalSpent: summary.totalSpent,
            budgetRemaining: project.budget - summary.totalSpent,
            budgetUsedPercent: project.budget > 0 ? (summary.totalSpent / project.budget) * 100 : 0
          }
        }
      })
    )

    return response.success(projectsWithSummary)
  } catch (error) {
    console.error('Error in GET /api/projects:', error)
    return response.error('Internal server error', 500)
  }
}

// POST /api/projects - Create new project (admin only)
export async function POST(request: NextRequest) {
  try {
    const { profile, supabase } = await getCurrentUserProfile()
    
    // Validate admin role
    if (!validateRole(profile, 'admin')) {
      return response.error('Only admins can create projects', 403)
    }

    const body = await request.json()
    const { name, description, budget, start_date, end_date } = body

    // Validate required fields
    if (!name || !budget || !start_date) {
      return response.error('Name, budget, and start_date are required', 400)
    }

    if (typeof budget !== 'number' || budget <= 0) {
      return response.error('Budget must be a positive number', 400)
    }

    // Create project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        company_id: profile.company_id,
        name: name.trim(),
        description: description?.trim() || null,
        budget,
        start_date,
        end_date: end_date || null,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return response.error('Failed to create project', 500)
    }

    // Log activity
    await logActivity(
      profile.company_id,
      profile.id,
      'project',
      project.id,
      'create',
      { projectName: project.name, budget: project.budget }
    )

    // Get project with summary
    const summary = await getProjectSummary(project.id, profile.company_id)
    const projectWithSummary = {
      ...project,
      summary: {
        totalOrders: 0,
        approvedOrders: 0,
        pendingOrders: 0,
        rejectedOrders: 0,
        totalExpenses: 0,
        approvedExpenses: 0,
        pendingExpenses: 0,
        totalDeliveries: 0,
        completedDeliveries: 0,
        pendingDeliveries: 0,
        totalSpent: 0,
        budgetRemaining: project.budget,
        budgetUsedPercent: 0
      }
    }

    return response.success(projectWithSummary, 201)
  } catch (error) {
    console.error('Error in POST /api/projects:', error)
    return response.error('Internal server error', 500)
  }
}