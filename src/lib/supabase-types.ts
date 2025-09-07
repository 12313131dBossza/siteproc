// Supabase Type Utilities
// This file provides type-safe wrappers for Supabase operations to avoid 'never' type issues

import { supabaseService } from '@/lib/supabase'

// Type assertion utility for Supabase queries
export function supabaseQuery<T = any>(query: any): T {
  return query as T
}

// Type-safe Supabase client wrapper
export function getTypedSupabaseClient() {
  const sb = supabaseService()
  
  return {
    // Type-safe insert operations
    insert: <T = any>(table: string, data: any) => {
      return (sb as any).from(table).insert(data).select('*').single() as Promise<{ data: T | null, error: any }>
    },
    
    // Type-safe select operations
    select: <T = any>(table: string, columns?: string) => {
      const query = (sb as any).from(table)
      return columns ? query.select(columns) : query.select('*')
    },
    
    // Type-safe update operations
    update: <T = any>(table: string, data: any) => {
      return (sb as any).from(table).update(data) as any
    },
    
    // Type-safe RPC operations
    rpc: <T = any>(functionName: string, params?: any) => {
      return (sb as any).rpc(functionName, params) as Promise<{ data: T | null, error: any }>
    },
    
    // Raw client access
    raw: sb
  }
}

// Common database table types (based on your schema)
export interface DatabaseRecord {
  id: string
  created_at: string
  updated_at?: string
}

export interface CompanyRecord extends DatabaseRecord {
  name: string
  currency?: string
  units?: string
}

export interface JobRecord extends DatabaseRecord {
  company_id: string
  name: string
  code: string
}

export interface OrderRecord extends DatabaseRecord {
  product_id?: string
  user_id?: string
  qty?: number
  note?: string
  status: string
  decided_at?: string
  decided_by?: string
}

export interface DeliveryRecord extends DatabaseRecord {
  order_id: string
  product_id: string
  delivered_qty: number
  delivered_at: string
  note?: string
  company_id: string
  created_by: string
}

export interface ProductRecord extends DatabaseRecord {
  name: string
  sku?: string
  unit?: string
  price?: number
}

// Utility function to handle null/undefined safely
export function safeAccess<T>(obj: any, path: string, defaultValue: T): T {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue
  } catch {
    return defaultValue
  }
}
