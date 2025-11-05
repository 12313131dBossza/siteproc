import { createServiceClient } from './supabase-service'
import { sendBudgetVarianceAlert } from './email'

// Budget warning thresholds
const BUDGET_WARNING_THRESHOLD = 75 // 75%
const BUDGET_CRITICAL_THRESHOLD = 90 // 90%
const BUDGET_EXCEEDED_THRESHOLD = 100 // 100%

interface ProjectBudgetStatus {
  projectId: string
  projectName: string
  companyId: string
  companyName: string
  budget: number
  spent: number
  percentageUsed: number
  threshold: 'warning' | 'critical' | 'exceeded'
}

/**
 * Check if a project budget has crossed warning thresholds
 * Returns the threshold level if alert should be sent, null otherwise
 */
export function shouldSendBudgetAlert(
  budget: number,
  spent: number,
  previousSpent: number
): 'warning' | 'critical' | 'exceeded' | null {
  const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0
  const previousPercentage = budget > 0 ? (previousSpent / budget) * 100 : 0

  // Check if we've crossed the exceeded threshold (100%)
  if (percentageUsed >= BUDGET_EXCEEDED_THRESHOLD && previousPercentage < BUDGET_EXCEEDED_THRESHOLD) {
    return 'exceeded'
  }

  // Check if we've crossed the critical threshold (90%)
  if (percentageUsed >= BUDGET_CRITICAL_THRESHOLD && previousPercentage < BUDGET_CRITICAL_THRESHOLD) {
    return 'critical'
  }

  // Check if we've crossed the warning threshold (75%)
  if (percentageUsed >= BUDGET_WARNING_THRESHOLD && previousPercentage < BUDGET_WARNING_THRESHOLD) {
    return 'warning'
  }

  return null
}

/**
 * Check project budget and send alerts if thresholds are crossed
 * Called after expenses are approved
 */
export async function checkProjectBudgetAndAlert(projectId: string, newExpenseAmount: number) {
  try {
    const supabase = createServiceClient()

    // Get project with company info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        budget,
        company_id,
        companies(name)
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Failed to fetch project for budget check:', projectError)
      return
    }

    // Get current project expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', projectId)
      .eq('status', 'approved')

    if (expensesError) {
      console.error('Failed to fetch expenses for budget check:', expensesError)
      return
    }

    const currentSpent = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const previousSpent = currentSpent - newExpenseAmount

    // Check if we should send an alert
    const alertLevel = shouldSendBudgetAlert(project.budget, currentSpent, previousSpent)

    if (!alertLevel) {
      console.log(`Project ${projectId}: No budget alert needed (${((currentSpent / project.budget) * 100).toFixed(1)}% used)`)
      return
    }

    // Get admin emails
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('email')
      .eq('company_id', project.company_id)
      .in('role', ['admin', 'owner', 'manager'])
      .not('email', 'is', null)

    if (adminError || !adminProfiles || adminProfiles.length === 0) {
      console.error('Failed to fetch admin emails for budget alert:', adminError)
      return
    }

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean) as string[]
    const percentageUsed = (currentSpent / project.budget) * 100

    console.log(` Budget Alert: Project ${project.name} is at ${percentageUsed.toFixed(1)}% (${alertLevel})`)

    // Send budget variance alert
    await sendBudgetVarianceAlert({
      projectId: project.id,
      projectName: project.name,
      companyName: project.companies?.name || 'Your Company',
      currentSpent,
      budget: project.budget,
      percentageUsed,
      adminEmails,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}`
    })

    console.log(` Budget alert sent to ${adminEmails.length} admin(s)`)

    // Log the budget alert
    await supabase
      .from('notifications')
      .insert({
        company_id: project.company_id,
        type: 'budget_alert',
        title: `Budget ${alertLevel === 'exceeded' ? 'Exceeded' : 'Warning'} - ${project.name}`,
        message: `Project budget is at ${percentageUsed.toFixed(1)}% (${currentSpent.toLocaleString()}/${project.budget.toLocaleString()})`,
        link: `/projects/${project.id}`,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          budget: project.budget,
          spent: currentSpent,
          percentageUsed,
          threshold: alertLevel
        }
      })

  } catch (error) {
    console.error('Error checking project budget:', error)
  }
}
