/**
 * Delay Shield™ AI Service
 * 
 * Core analysis engine that:
 * 1. Pulls project data (orders, deliveries, expenses, timelines)
 * 2. Fetches weather forecasts
 * 3. Analyzes historical supplier performance
 * 4. Uses AI to predict delays and calculate $ impact
 * 5. Generates 3 ranked recovery options
 */

import { supabaseService } from '@/lib/supabase';

// Types
export interface DelayRiskFactor {
  type: 'supplier' | 'weather' | 'timeline' | 'budget' | 'dependency';
  name: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

export interface RecoveryOption {
  id: number;
  name: string;
  type: 'fastest' | 'cheapest' | 'balanced';
  cost: number;
  time_saved_days: number;
  description: string;
  action_items: string[];
  recommended: boolean;
}

export interface DelayPrediction {
  project_id: string;
  risk_score: number; // 0-1
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  financial_impact: number;
  contributing_factors: DelayRiskFactor[];
  recovery_options: RecoveryOption[];
  email_draft: {
    to: string[];
    subject: string;
    body: string;
  };
}

export interface ProjectData {
  project: any;
  orders: any[];
  deliveries: any[];
  expenses: any[];
  suppliers: any[];
  milestones: any[];
}

// Weather integration using Open-Meteo (FREE, no API key required!)
// https://open-meteo.com/en/docs

export async function getWeatherForecast(lat: number, lon: number): Promise<any> {
  try {
    // Open-Meteo is free and doesn't require any API key
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=7`
    );
    
    if (!response.ok) {
      console.error('[DelayShield] Weather API error:', response.status);
      return mockWeatherData();
    }

    const data = await response.json();
    return parseOpenMeteoForecast(data);
  } catch (error) {
    console.error('[DelayShield] Weather fetch error:', error);
    return mockWeatherData();
  }
}

function mockWeatherData() {
  return {
    forecast_days: 7,
    rain_days: 2,
    avg_temp: 22,
    extreme_conditions: false,
    summary: 'Weather data unavailable - using estimate',
    daily: []
  };
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
  };
  return weatherCodes[code] || 'Unknown';
}

function isRainyWeatherCode(code: number): boolean {
  // Rain codes: 51-55 (drizzle), 61-65 (rain), 80-82 (showers), 95-99 (thunderstorm)
  return (code >= 51 && code <= 55) || (code >= 61 && code <= 65) || 
         (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

function parseOpenMeteoForecast(data: any) {
  const daily = data.daily || {};
  const weatherCodes = daily.weather_code || [];
  const temps = daily.temperature_2m_max || [];
  const precipitation = daily.precipitation_sum || [];
  const precipProb = daily.precipitation_probability_max || [];
  
  // Count rain days (weather code indicates rain OR high precipitation probability)
  const rainDays = weatherCodes.filter((code: number, i: number) => 
    isRainyWeatherCode(code) || (precipProb[i] && precipProb[i] > 60)
  ).length;
  
  // Check for extreme conditions (heavy rain, thunderstorms, heavy snow)
  const extremeCodes = [65, 75, 82, 95, 96, 99]; // Heavy rain, heavy snow, violent showers, thunderstorms
  const hasExtreme = weatherCodes.some((code: number) => extremeCodes.includes(code));
  
  // Calculate average temperature
  const avgTemp = temps.length > 0 
    ? Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length)
    : 22;

  // Build daily forecast array for detailed display
  const dailyForecast = weatherCodes.map((code: number, i: number) => ({
    day: i + 1,
    weather: getWeatherDescription(code),
    temp_max: temps[i] || 22,
    precipitation_mm: precipitation[i] || 0,
    rain_probability: precipProb[i] || 0,
    is_rainy: isRainyWeatherCode(code)
  }));

  return {
    forecast_days: weatherCodes.length,
    rain_days: rainDays,
    avg_temp: avgTemp,
    extreme_conditions: hasExtreme || rainDays >= 4,
    summary: weatherCodes.length > 0 ? getWeatherDescription(weatherCodes[0]) : 'Unknown',
    total_precipitation_mm: precipitation.reduce((a: number, b: number) => a + b, 0),
    daily: dailyForecast
  };
}

// Fetch all project data for analysis
export async function fetchProjectData(projectId: string, companyId: string): Promise<ProjectData> {
  const supabase = supabaseService();

  const [
    projectRes,
    ordersRes,
    deliveriesRes,
    expensesRes,
    milestonesRes
  ] = await Promise.allSettled([
    supabase.from('projects').select('*').eq('id', projectId).eq('company_id', companyId).single(),
    supabase.from('purchase_orders').select('*, profiles:created_by(full_name, email)').eq('project_id', projectId).eq('company_id', companyId),
    supabase.from('deliveries').select('*, delivery_items(*)').eq('company_id', companyId),
    supabase.from('expenses').select('*').eq('project_id', projectId).eq('company_id', companyId),
    supabase.from('project_milestones').select('*').eq('project_id', projectId)
  ]);

  const project = projectRes.status === 'fulfilled' ? projectRes.value.data : null;
  const orders: any[] = ordersRes.status === 'fulfilled' ? (ordersRes.value.data || []) : [];
  const deliveries: any[] = deliveriesRes.status === 'fulfilled' ? (deliveriesRes.value.data || []) : [];
  const expenses: any[] = expensesRes.status === 'fulfilled' ? (expensesRes.value.data || []) : [];
  const milestones: any[] = milestonesRes.status === 'fulfilled' ? (milestonesRes.value.data || []) : [];

  console.log(`[DelayShield] Project data for ${projectId}:`, {
    hasProject: !!project,
    ordersCount: orders.length,
    deliveriesCount: deliveries.length,
    expensesCount: expenses.length,
    milestonesCount: milestones.length,
    milestones: milestones.map(m => ({ name: m.name, target_date: m.target_date, completed: m.completed }))
  });

  // Extract unique suppliers from orders
  const suppliers = [...new Set(orders.map((o: any) => o.vendor).filter(Boolean))].map(v => ({ name: v }));

  return { project, orders, deliveries, expenses, suppliers, milestones };
}

// Analyze supplier performance history
export function analyzeSupplierPerformance(orders: any[], deliveries: any[]): Map<string, any> {
  const supplierStats = new Map<string, any>();

  orders.forEach(order => {
    if (!order.vendor) return;
    
    const stats = supplierStats.get(order.vendor) || {
      name: order.vendor,
      total_orders: 0,
      late_deliveries: 0,
      on_time_rate: 1,
      avg_delay_days: 0
    };

    stats.total_orders++;

    // Check if delivery was late
    const orderDeliveries = deliveries.filter(d => d.po_id === order.id);
    const hasLateDelivery = orderDeliveries.some(d => {
      if (!d.delivered_at || !order.expected_delivery) return false;
      return new Date(d.delivered_at) > new Date(order.expected_delivery);
    });

    if (hasLateDelivery) {
      stats.late_deliveries++;
    }

    stats.on_time_rate = (stats.total_orders - stats.late_deliveries) / stats.total_orders;
    supplierStats.set(order.vendor, stats);
  });

  return supplierStats;
}

// Calculate financial impact of delays
export function calculateFinancialImpact(
  project: any,
  orders: any[],
  expenses: any[],
  delayDays: number
): number {
  // Base daily cost from project budget
  const projectDuration = 90; // Default 90 days
  const dailyBudget = (project?.budget || 0) / projectDuration;

  // Calculate daily crew/labor cost from expenses
  const laborExpenses = expenses.filter(e => 
    e.category?.toLowerCase().includes('labor') || 
    e.category?.toLowerCase().includes('crew') ||
    e.category?.toLowerCase().includes('wage')
  );
  const totalLabor = laborExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const dailyLabor = totalLabor / Math.max(expenses.length, 1) * 5; // Rough estimate

  // Pending orders value at risk
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'approved');
  const pendingValue = pendingOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const riskFromPending = pendingValue * 0.1; // 10% at risk

  // Calculate total impact
  const directCost = dailyBudget * delayDays;
  const laborCost = dailyLabor * delayDays;
  const opportunityCost = dailyBudget * delayDays * 0.2; // 20% opportunity cost

  return Math.round(directCost + laborCost + opportunityCost + riskFromPending);
}

// Identify risk factors from project data
export function identifyRiskFactors(
  projectData: ProjectData,
  supplierStats: Map<string, any>,
  weather: any
): DelayRiskFactor[] {
  const factors: DelayRiskFactor[] = [];
  const { project, orders, deliveries, expenses, milestones } = projectData;

  // 1. Check for old pending orders (orders pending for more than 7 days = high risk)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  // First check if expected_delivery exists, otherwise use created_at age
  const lateOrders = orders.filter(o => {
    if (o.status !== 'pending') return false;
    
    // If expected_delivery exists, use it
    if (o.expected_delivery) {
      return new Date(o.expected_delivery) < now;
    }
    
    // Otherwise, check if order has been pending for too long
    if (o.created_at) {
      return new Date(o.created_at) < sevenDaysAgo;
    }
    
    return false;
  });
  
  if (lateOrders.length > 0) {
    factors.push({
      type: 'supplier',
      name: lateOrders[0].vendor || 'Unknown Supplier',
      issue: `${lateOrders.length} order(s) pending for extended period`,
      severity: lateOrders.length > 2 ? 'high' : 'medium',
      confidence: 0.9
    });
  }

  // 1b. Check for stale pending orders (3-7 days old)
  const stalePendingOrders = orders.filter(o => {
    if (o.status !== 'pending') return false;
    if (o.created_at) {
      const createdAt = new Date(o.created_at);
      return createdAt < threeDaysAgo && createdAt >= sevenDaysAgo;
    }
    return false;
  });

  if (stalePendingOrders.length > 0 && lateOrders.length === 0) {
    factors.push({
      type: 'supplier',
      name: stalePendingOrders[0].vendor || 'Multiple Suppliers',
      issue: `${stalePendingOrders.length} order(s) pending for 3+ days`,
      severity: 'medium',
      confidence: 0.7
    });
  }

  // 2. Check supplier reliability
  supplierStats.forEach((stats, supplier) => {
    if (stats.on_time_rate < 0.7) {
      factors.push({
        type: 'supplier',
        name: supplier,
        issue: `Historical on-time rate only ${Math.round(stats.on_time_rate * 100)}%`,
        severity: stats.on_time_rate < 0.5 ? 'high' : 'medium',
        confidence: 0.8
      });
    }
  });

  // 3. Check weather conditions
  if (weather.rain_days >= 2) {
    factors.push({
      type: 'weather',
      name: 'Weather Forecast',
      issue: `${weather.rain_days} rain days expected in next 5 days`,
      severity: weather.rain_days >= 3 ? 'high' : 'medium',
      confidence: 0.75
    });
  }

  if (weather.extreme_conditions) {
    factors.push({
      type: 'weather',
      name: 'Extreme Weather',
      issue: 'Severe weather conditions forecasted',
      severity: 'high',
      confidence: 0.85
    });
  }

  // 4. Check budget health
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budget = project?.budget || 0;
  const budgetUsed = budget > 0 ? totalSpent / budget : 0;

  if (budgetUsed > 0.9) {
    factors.push({
      type: 'budget',
      name: 'Budget Status',
      issue: `${Math.round(budgetUsed * 100)}% of budget spent, limited funds for contingencies`,
      severity: budgetUsed > 1 ? 'high' : 'medium',
      confidence: 0.95
    });
  }

  // 5. Check milestone delays (supports both column naming conventions)
  const overdueMilestones = milestones.filter(m => {
    const isCompleted = m.completed === true || m.status === 'completed';
    const dueDate = m.target_date || m.due_date;
    return !isCompleted && dueDate && new Date(dueDate) < new Date();
  });

  if (overdueMilestones.length > 0) {
    factors.push({
      type: 'timeline',
      name: 'Milestone Delays',
      issue: `${overdueMilestones.length} milestone(s) past due date`,
      severity: overdueMilestones.length > 1 ? 'high' : 'medium',
      confidence: 0.9
    });
  }

  // 6. Check delivery completion rate
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
  const deliveryRate = totalDeliveries > 0 ? completedDeliveries / totalDeliveries : 1;

  if (deliveryRate < 0.5 && totalDeliveries > 3) {
    factors.push({
      type: 'dependency',
      name: 'Delivery Progress',
      issue: `Only ${Math.round(deliveryRate * 100)}% of deliveries completed`,
      severity: 'medium',
      confidence: 0.85
    });
  }

  return factors;
}

// Calculate overall risk score
export function calculateRiskScore(factors: DelayRiskFactor[]): { score: number; level: string } {
  console.log('[DelayShield] Calculating risk from factors:', factors.length, factors);
  
  if (factors.length === 0) {
    return { score: 0.1, level: 'low' };
  }

  // Weighted average based on severity and confidence
  const severityWeights = { low: 0.3, medium: 0.6, high: 0.9 }; // Increased weights
  
  const weightedSum = factors.reduce((sum, f) => {
    const weight = severityWeights[f.severity] || 0.5;
    return sum + (weight * f.confidence);
  }, 0);

  // More aggressive score calculation
  let score = Math.min(weightedSum / factors.length, 1);
  
  // Boost score based on number of factors
  if (factors.length >= 3) {
    score = Math.min(score * 1.3, 1);
  } else if (factors.length >= 2) {
    score = Math.min(score * 1.15, 1);
  }

  // Boost score if multiple high severity factors
  const highSeverityCount = factors.filter(f => f.severity === 'high').length;
  if (highSeverityCount >= 2) {
    score = Math.min(score * 1.2, 1);
  } else if (highSeverityCount >= 1) {
    score = Math.min(score * 1.1, 1);
  }

  // Determine level
  let level: string;
  if (score >= 0.7) level = 'critical';
  else if (score >= 0.45) level = 'high';
  else if (score >= 0.2) level = 'medium';
  else level = 'low';

  console.log('[DelayShield] Risk score calculated:', { score, level, factorCount: factors.length });

  return { score: Math.round(score * 100) / 100, level };
}

// Generate recovery options
export function generateRecoveryOptions(
  factors: DelayRiskFactor[],
  projectData: ProjectData,
  delayDays: number,
  financialImpact: number
): RecoveryOption[] {
  const { project, orders } = projectData;
  const options: RecoveryOption[] = [];

  // Find problematic suppliers
  const supplierIssues = factors.filter(f => f.type === 'supplier');
  const weatherIssues = factors.filter(f => f.type === 'weather');

  // Option 1: FASTEST - Switch supplier / expedite
  const fastestOption: RecoveryOption = {
    id: 1,
    name: 'Switch to Backup Supplier',
    type: 'fastest',
    cost: Math.round(financialImpact * 0.05), // 5% of impact
    time_saved_days: Math.max(delayDays - 1, 1),
    description: supplierIssues.length > 0
      ? `Contact alternative supplier for ${supplierIssues[0].name}'s pending items. Pay expedite fee for priority processing.`
      : 'Expedite current orders with priority shipping and processing fees.',
    action_items: [
      'Identify backup supplier from approved vendor list',
      'Request expedited quote (within 24hrs)',
      'Cancel/reduce order with delayed supplier',
      'Update project timeline in system'
    ],
    recommended: supplierIssues.length > 0 && supplierIssues[0].severity === 'high'
  };
  options.push(fastestOption);

  // Option 2: CHEAPEST - Wait and adjust schedule
  const cheapestOption: RecoveryOption = {
    id: 2,
    name: 'Adjust Schedule & Wait',
    type: 'cheapest',
    cost: 0,
    time_saved_days: 0,
    description: weatherIssues.length > 0
      ? 'Pause weather-sensitive work and reschedule crews for indoor tasks. Resume once conditions improve.'
      : 'Accept the delay, notify stakeholders, and adjust project timeline accordingly.',
    action_items: [
      'Update project timeline with new dates',
      'Notify client and stakeholders of delay',
      'Reassign crews to non-critical tasks',
      'Document delay reason for records'
    ],
    recommended: factors.every(f => f.severity !== 'high')
  };
  options.push(cheapestOption);

  // Option 3: BALANCED - Partial expedite + overtime
  const balancedOption: RecoveryOption = {
    id: 3,
    name: 'Partial Fix + Overtime',
    type: 'balanced',
    cost: Math.round(financialImpact * 0.02), // 2% of impact
    time_saved_days: Math.ceil(delayDays * 0.6),
    description: 'Split approach: Expedite critical path items only, add weekend/overtime for installation crews to compress remaining schedule.',
    action_items: [
      'Identify critical path items only',
      'Expedite only highest-priority orders',
      'Schedule overtime for key crews',
      'Request partial delivery from suppliers'
    ],
    recommended: !options.some(o => o.recommended)
  };
  options.push(balancedOption);

  // Ensure one option is recommended
  if (!options.some(o => o.recommended)) {
    options[2].recommended = true;
  }

  return options;
}

// Generate email draft
export function generateEmailDraft(
  projectData: ProjectData,
  prediction: Partial<DelayPrediction>,
  selectedOption?: RecoveryOption
): { to: string[]; subject: string; body: string } {
  const { project, orders } = projectData;
  const projectName = project?.name || 'Project';
  
  // Get stakeholder emails
  const supplierEmails = orders
    .filter(o => o.profiles?.email)
    .map(o => o.profiles.email)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);

  const riskLevel = prediction.risk_level || 'medium';
  const delayDays = prediction.predicted_delay_days || 0;
  const impact = prediction.financial_impact || 0;

  const subject = selectedOption
    ? `[Action Taken] ${projectName} - Delay Mitigation Plan Activated`
    : `[Alert] ${projectName} - ${riskLevel.toUpperCase()} Risk: ${delayDays}-Day Delay Predicted`;

  const body = selectedOption
    ? `
Dear Team,

We've activated a delay mitigation plan for ${projectName}.

SELECTED ACTION: ${selectedOption.name}
- Estimated Cost: $${selectedOption.cost.toLocaleString()}
- Time Recovered: ${selectedOption.time_saved_days} days

ACTION ITEMS:
${selectedOption.action_items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Original Impact Assessment:
- Predicted Delay: ${delayDays} days
- Financial Risk: $${impact.toLocaleString()}

Please confirm receipt and begin executing the action items above.

Best regards,
SiteProc Delay Shield™
    `.trim()
    : `
Dear Team,

Our AI monitoring system has identified a potential delay risk for ${projectName}.

RISK ASSESSMENT:
- Risk Level: ${riskLevel.toUpperCase()}
- Predicted Delay: ${delayDays} days
- Estimated Financial Impact: $${impact.toLocaleString()}

CONTRIBUTING FACTORS:
${(prediction.contributing_factors || []).map(f => `- ${f.name}: ${f.issue}`).join('\n')}

Please review the recovery options in SiteProc and select a mitigation plan.

Best regards,
SiteProc Delay Shield™
    `.trim();

  return {
    to: supplierEmails.length > 0 ? supplierEmails : ['team@example.com'],
    subject,
    body
  };
}

// Main analysis function
export async function analyzeProjectForDelays(
  projectId: string,
  companyId: string,
  weatherCoords?: { lat: number; lon: number }
): Promise<DelayPrediction> {
  console.log(`[DelayShield] Analyzing project ${projectId} for company ${companyId}`);

  // 1. Fetch project data
  const projectData = await fetchProjectData(projectId, companyId);
  
  if (!projectData.project) {
    throw new Error('Project not found');
  }

  // 2. Get weather forecast (default to generic if no coords)
  const weather = weatherCoords 
    ? await getWeatherForecast(weatherCoords.lat, weatherCoords.lon)
    : mockWeatherData();

  // 3. Analyze supplier performance
  const supplierStats = analyzeSupplierPerformance(projectData.orders, projectData.deliveries);

  // 4. Identify risk factors
  const factors = identifyRiskFactors(projectData, supplierStats, weather);

  // 5. Calculate risk score
  const { score, level } = calculateRiskScore(factors);

  // 6. Estimate delay days based on factors
  let delayDays = 0;
  factors.forEach(f => {
    if (f.type === 'supplier' && f.severity === 'high') delayDays += 3;
    else if (f.type === 'supplier') delayDays += 1;
    if (f.type === 'weather' && f.severity === 'high') delayDays += 2;
    else if (f.type === 'weather') delayDays += 1;
    if (f.type === 'timeline') delayDays += 2;
  });
  delayDays = Math.min(delayDays, 14); // Cap at 14 days

  // 7. Calculate financial impact
  const financialImpact = calculateFinancialImpact(
    projectData.project,
    projectData.orders,
    projectData.expenses,
    delayDays
  );

  // 8. Generate recovery options
  const recoveryOptions = generateRecoveryOptions(
    factors,
    projectData,
    delayDays,
    financialImpact
  );

  // 9. Generate email draft
  const emailDraft = generateEmailDraft(projectData, {
    risk_level: level as any,
    predicted_delay_days: delayDays,
    financial_impact: financialImpact,
    contributing_factors: factors
  });

  const prediction: DelayPrediction = {
    project_id: projectId,
    risk_score: score,
    risk_level: level as any,
    predicted_delay_days: delayDays,
    financial_impact: financialImpact,
    contributing_factors: factors,
    recovery_options: recoveryOptions,
    email_draft: emailDraft
  };

  console.log(`[DelayShield] Analysis complete for ${projectId}:`, {
    riskLevel: level,
    riskScore: score,
    delayDays,
    financialImpact,
    factorsCount: factors.length
  });

  return prediction;
}

// Batch analyze all active projects for a company
export async function analyzeAllProjects(companyId: string): Promise<DelayPrediction[]> {
  const supabase = supabaseService();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (error || !projects) {
    console.error('[DelayShield] Failed to fetch projects:', error);
    return [];
  }

  const predictions: DelayPrediction[] = [];

  for (const project of projects as any[]) {
    try {
      const prediction = await analyzeProjectForDelays(project.id, companyId);
      predictions.push(prediction);
    } catch (err) {
      console.error(`[DelayShield] Failed to analyze project ${project.id}:`, err);
    }
  }

  return predictions;
}
