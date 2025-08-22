import { JobEventPayload } from '@/lib/useJobRealtime'
export function isJobEventPayload(obj: any): obj is JobEventPayload { return obj && typeof obj === 'object' && typeof obj.kind === 'string' && 'job_id' in obj && 'at' in obj }
