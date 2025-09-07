import { supabaseService } from './supabase'

export interface AuditMeta {
  ip?: string | null
  userAgent?: string | null
}

export async function audit(
  companyId: string,
  actorId: string | null,
  entity: string,
  id: string,
  verb: string,
  payload: unknown,
  meta?: AuditMeta
) {
  const sb = supabaseService()
  const fullPayload = meta ? { ...((typeof payload === 'object' && payload) ? payload as any : { value: payload }), _meta: { ip: meta.ip || null, ua: meta.userAgent || null } } : payload
  const { error } = await (sb as any).from('events').insert({
    company_id: companyId,
    actor_id: actorId,
    entity,
    entity_id: id,
    verb,
    payload: fullPayload
  })
  if (error) throw error
}
