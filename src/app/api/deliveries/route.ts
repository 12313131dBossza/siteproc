import { uploadPrivateSigned } from '@/lib/storage'
import { EVENTS } from '@/lib/constants'

// Reintroduced imports (file was previously corrupted during patching)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { logActivity } from '@/app/api/activity/route'
import { parseJson } from '@/lib/api'
import { deliveryCreateSchema } from '@/lib/validation'
import { broadcastDeliveryUpdated, broadcast, broadcastPoUpdated, broadcastDashboardUpdated } from '@/lib/realtime'
import { getSessionProfile, enforceRole } from '@/lib/auth'

export const runtime = 'nodejs'

async function uploadDataUrl(sb: ReturnType<typeof supabaseService>, path: string, dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/)
  if (!match) throw new Error('Bad data URL')
  const base64 = match[2]
  const bytes = Buffer.from(base64, 'base64')
  const url = await uploadPrivateSigned(path, bytes, match[1])
  return url
}

// Simple handler for project-based deliveries (from AddItemModal)
async function handleProjectDelivery(body: any, session: any) {
  const { project_id, delivery_date, status, notes, proof_url } = body
  
  // Validate required fields
  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  }
  
  const sb = supabaseService()
  
  // Verify project exists and user has access
  const { data: project, error: projectError } = await (sb as any)
    .from('projects')
    .select('id, name, company_id')
    .eq('id', project_id)
    .eq('company_id', session.companyId)
    .single()
  
  if (projectError || !project) {
    console.error('Project verification error:', projectError)
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
  }
  
  // Check if user has permission to create deliveries on this project
  // Get user's profile role
  const { data: profile } = await (sb as any)
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  const isFullCompanyMember = ['admin', 'owner', 'manager', 'accountant', 'bookkeeper', 'member'].includes(profile?.role || '')
  
  if (!isFullCompanyMember) {
    // External user - check project_members for create_orders permission
    const { data: membership } = await (sb as any)
      .from('project_members')
      .select('permissions')
      .eq('project_id', project_id)
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()
    
    if (!membership?.permissions?.create_orders) {
      return NextResponse.json({ error: 'You do not have permission to create deliveries on this project' }, { status: 403 })
    }
  }
  
  // Create simple delivery with optional proof_url
  const { data: delivery, error } = await (sb as any)
    .from('deliveries')
    .insert({
      company_id: session.companyId,
      project_id: project_id,
      status: status || 'pending',
      notes: notes || '',
      proof_url: proof_url || null,
      delivered_at: delivery_date || new Date().toISOString()
    })
    .select('*')
    .single()
  
  if (error || !delivery) {
    console.error('Delivery creation error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create delivery' }, { status: 500 })
  }
  
  console.log('✅ Created project delivery:', delivery.id)
  
  // Log activity
  await audit(
    session.companyId as string,
    session.user.id,
    'delivery',
    delivery.id as string,
    'create',
    { project_id, status: delivery.status }
  )
  
  // Broadcast update
  await broadcastDashboardUpdated(session.companyId!)
  
  return NextResponse.json({ ok: true, data: delivery }, { status: 201 })
}

export async function POST(req: NextRequest) {
  const session = await getSessionProfile()
  if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
  
  const body = await req.json()
  console.log('📥 Delivery creation request:', body)
  
  // Check if this is a simple project-based delivery (from AddItemModal)
  if (body.project_id && !body.job_id) {
    console.log('✅ Creating simple project-based delivery')
    return handleProjectDelivery(body, session)
  }
  
  // Original job-based delivery flow
  // 'foreman' legacy role mapped to 'viewer' minimum permission for creation; adjust if stricter needed
  enforceRole('viewer', session)
  const payload = await parseJson(req, deliveryCreateSchema)
  const sb = supabaseService()

  const { data: delivery, error } = await (sb as any)
    .from('deliveries')
    .insert({
  company_id: session.companyId,
      job_id: payload.job_id,
      po_id: payload.po_id ?? null,
      notes: payload.notes ?? null,
      signer_name: payload.signer_name ?? null,
    })
    .select('*')
    .single()
  if (error || !delivery) return NextResponse.json({ error: error?.message || 'create failed' }, { status: 500 })

  const items = payload.items.map((it: any) => ({
  company_id: session.companyId,
    delivery_id: delivery.id,
    description: it.description,
    qty: it.qty,
    unit: it.unit,
    sku: it.sku,
    partial: !!it.partial,
  }))
  const { error: itemsErr } = await (sb as any).from('delivery_items').insert(items as any)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  const photoUrls: string[] = []
  for (let i = 0; i < (payload.photo_data_urls?.length || 0); i++) {
    const url = await uploadDataUrl(sb, `deliveries/${delivery.id}/${i}.jpg`, payload.photo_data_urls![i])
    photoUrls.push(url)
  }
  if (payload.signature_data_url) {
    const sig = await uploadDataUrl(sb, `deliveries/${delivery.id}/signature.png`, payload.signature_data_url)
    await (sb as any).from('deliveries').update({ signature_url: sig } as any).eq('id', delivery.id as string)
  }
  for (const url of photoUrls) {
    await (sb as any).from('photos').insert({ company_id: session.companyId, job_id: payload.job_id, entity: 'delivery', entity_id: delivery.id, url } as any)
  }

  await audit(session.companyId as string, session.user.id, 'delivery', delivery.id as string, 'create', { items: items.length, photos: photoUrls.length })
  
  // Log to new Activity Log system
  await logActivity({
    type: 'delivery',
    action: 'created',
    title: `Delivery created`,
    description: `New delivery #${delivery.delivery_number || (delivery.id as string).substring(0, 8)} created with ${items.length} items`,
    entity_type: 'delivery',
    entity_id: delivery.id as string,
    metadata: {
      delivery_id: delivery.id,
      delivery_number: delivery.delivery_number,
      order_id: payload.po_id,
      project_id: payload.job_id,
      items_count: items.length,
      photos_count: photoUrls.length,
      status: delivery.status,
    },
    status: 'success',
    user_id: session.user.id,
    company_id: session.companyId,
  })
  
  await Promise.all([
    broadcastDeliveryUpdated(delivery.id as string, ['create']),
    broadcast(`job:${payload.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { kind: 'delivery', job_id: payload.job_id, delivery_id: delivery.id as string, at: new Date().toISOString() }),
    broadcastDashboardUpdated(session.companyId!)
  ])

  if (payload.po_id) {
    try {
      const sb2 = sb
      const { data: po } = await (sb2 as any).from('pos').select('id,rfq_id,status').eq('id', payload.po_id as string).eq('company_id', session.companyId).single()
      if (po && po.rfq_id) {
        const { data: orderedItems } = await (sb2 as any).from('rfq_items').select('qty').eq('company_id', session.companyId).eq('rfq_id', po.rfq_id as string)
  const orderedTotal = (orderedItems || []).reduce((s: number, r: any) => s + Number(r.qty || 0), 0)
        const { data: allDelivs } = await (sb2 as any).from('deliveries').select('id,notes').eq('company_id', session.companyId).eq('po_id', payload.po_id as string)
        const deliveryIds = (allDelivs || []).map((d: any) => d.id)
        let deliveredTotal = 0
        if (deliveryIds.length) {
          const { data: allItems } = await (sb2 as any).from('delivery_items').select('qty,delivery_id').in('delivery_id', deliveryIds as any)
          deliveredTotal = (allItems || []).reduce((s: number, r: any) => s + Number(r.qty || 0), 0)
        }
        if (orderedTotal > 0) {
          if (deliveredTotal >= orderedTotal) {
            if (po.status !== 'complete') {
              await (sb2 as any).from('pos').update({ status: 'complete', updated_at: new Date().toISOString() } as any).eq('id', po.id as string)
              await broadcastPoUpdated(po.id as string, ['status'])
              await audit(session.companyId as string, session.user.id, 'po', po.id as string, 'status_auto_complete', { delivered_total: deliveredTotal, ordered_total: orderedTotal })
            }
            for (const d of (allDelivs || [])) {
              if (d.notes && typeof d.notes === 'string' && d.notes.startsWith('Backorder')) {
                await (sb2 as any).from('deliveries').update({ status: 'delivered', updated_at: new Date().toISOString() } as any).eq('id', d.id as string)
              }
            }
          } else {
            const remaining = orderedTotal - deliveredTotal
            const existingBackorder = (allDelivs || []).find((d: any) => d.notes && typeof d.notes === 'string' && d.notes.startsWith('Backorder'))
            if (!existingBackorder) {
              const { data: backorder, error: boErr } = await (sb2 as any).from('deliveries').insert({
                company_id: session.companyId,
                job_id: payload.job_id,
                po_id: payload.po_id,
                status: 'pending',
                notes: `Backorder remaining ${remaining}`,
              }).select('id').single()
              if (!boErr && backorder) {
                await (sb2 as any).from('delivery_items').insert({
                  company_id: session.companyId,
                  delivery_id: backorder.id,
                  description: 'Backorder',
                  qty: remaining,
                  partial: true,
                } as any)
                await audit(session.companyId as string, session.user.id, 'delivery', backorder.id as string, 'backorder_create', { remaining })
                await broadcast(`job:${payload.job_id}`, EVENTS.JOB_DELIVERY_UPDATED, { kind: 'delivery', job_id: payload.job_id, delivery_id: backorder.id as string, at: new Date().toISOString() })
              }
            } else {
              const note = `Backorder remaining ${remaining}`
              if (existingBackorder.notes !== note) {
                await (sb2 as any).from('deliveries').update({ notes: note, updated_at: new Date().toISOString() } as any).eq('id', existingBackorder.id as string)
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[po-backorder]', e?.message || e)
    }
  }

  return NextResponse.json({ id: delivery.id })
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionProfile()
    if (!session.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    if (!session.companyId) return NextResponse.json({ error: 'no_company' }, { status: 400 })
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    const projectId = url.searchParams.get('project_id')
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
    const cursor = url.searchParams.get('cursor')
    const sb = supabaseService()
    
    // Get user's profile role
    const { data: profile } = await (sb as any)
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    let userRole = profile?.role as string | null
    
    // Check project_members to see if they're a supplier/client/contractor
    // This handles cases where profile.role wasn't updated correctly
    const { data: membershipCheck } = await (sb as any)
      .from('project_members')
      .select('external_type')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    
    // Override role based on project membership external_type
    if (membershipCheck?.external_type === 'supplier' && userRole === 'viewer') {
      userRole = 'supplier'
    } else if (membershipCheck?.external_type === 'contractor' && userRole === 'viewer') {
      userRole = 'contractor'
    } else if (membershipCheck?.external_type === 'client' && userRole === 'viewer') {
      userRole = 'client'
    }
    
    const isSupplierOrContractor = userRole === 'supplier' || userRole === 'contractor'
    
    // For external viewers/clients: only show deliveries from projects they have access to AND have view_orders permission
    // For suppliers/contractors: show deliveries from their assigned projects (they can update their deliveries)
    if (userRole === 'viewer' || userRole === 'client') {
      // Get project IDs the viewer has access to WITH their permissions
      const { data: memberProjects, error: memberError } = await (sb as any)
        .from('project_members')
        .select('project_id, permissions')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
      
      if (memberError) {
        console.error('Error fetching project memberships:', memberError)
        return NextResponse.json({ success: true, data: [] })
      }
      
      if (!memberProjects || memberProjects.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
      
      // Filter to only projects where user has view_orders permission (deliveries are part of orders)
      const projectsWithAccess = memberProjects.filter((p: any) => {
        const perms = p.permissions as Record<string, boolean> | null
        return perms?.view_orders === true
      })
      
      if (projectsWithAccess.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
      
      const projectIds = projectsWithAccess.map((p: any) => p.project_id)
      
      // If specific project/job requested, verify access
      if (projectId && !projectIds.includes(projectId)) {
        return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
      }
      if (jobId && !projectIds.includes(jobId)) {
        return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
      }
      
      // Build query to filter deliveries by accessible project IDs
      let query = (sb as any)
        .from('deliveries')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (projectId) query = query.eq('project_id', projectId)
      if (jobId) query = query.eq('job_id', jobId)
      if (cursor) query = query.lt('created_at', cursor)
      
      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: data || [] })
    }
    
    // For suppliers/contractors: show deliveries from their assigned projects
    if (isSupplierOrContractor) {
      const { data: memberProjects } = await (sb as any)
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
      
      if (!memberProjects || memberProjects.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }
      
      const projectIds = memberProjects.map((p: any) => p.project_id)
      
      let query = (sb as any)
        .from('deliveries')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (projectId) query = query.eq('project_id', projectId)
      if (jobId) query = query.eq('job_id', jobId)
      if (cursor) query = query.lt('created_at', cursor)
      
      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: data || [] })
    }
    
    // If no job_id, return all deliveries for company (for dashboard) - internal users
    if (!jobId) {
      const { data, error } = await (sb as any)
        .from('deliveries')
        .select('*')
        .eq('company_id', session.companyId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: data || [] })
    }
    
    // Original job-specific query for internal users
    let q = sb
      .from('deliveries')
      .select('id,job_id,po_id,status,delivered_at,created_at')
      .eq('company_id', session.companyId)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)
    if (cursor) q = (q as any).lt('created_at', cursor)
    const { data, error } = await q as any
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data || []) as any[]
    let nextCursor: string | null = null
    if (items.length > limit) {
      const extra = items.pop()
      nextCursor = items[items.length - 1]?.created_at || extra?.created_at || null
    }
    return NextResponse.json({ items, nextCursor })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
  }
}
