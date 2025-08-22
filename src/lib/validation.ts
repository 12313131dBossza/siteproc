import { z } from 'zod'

export const rfqItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().nonnegative(),
  unit: z.string().optional(),
  sku: z.string().optional(),
})

export const rfqCreateSchema = z.object({
  job_id: z.string().uuid(),
  title: z.string().optional(),
  needed_date: z.string().optional(), // YYYY-MM-DD
  items: z.array(rfqItemSchema).min(1),
})

export const quoteSubmitSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  total: z.number().nonnegative(),
  lead_time: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
})

export const deliveryItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().nonnegative(),
  unit: z.string().optional(),
  sku: z.string().optional(),
  partial: z.boolean().optional(),
})

export const deliveryCreateSchema = z.object({
  job_id: z.string().uuid(),
  po_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  signer_name: z.string().optional(),
  signature_data_url: z.string().optional(),
  items: z.array(deliveryItemSchema).min(1),
  photo_data_urls: z.array(z.string()).default([]),
})

export const changeOrderCreateSchema = z.object({
  job_id: z.string().uuid(),
  description: z.string().min(1),
  cost_delta: z.number(),
  approver_email: z.string().email(),
  photo_data_urls: z.array(z.string()).default([]),
})

export const expenseCreateSchema = z.object({
  job_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional(),
  cost_code_id: z.string().uuid().optional(),
  amount: z.number().nonnegative(),
    spent_at: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,'YYYY-MM-DD'),
  memo: z.string().optional(),
})

export const costCodeCreateSchema = z.object({
  job_id: z.string().uuid().optional(),
  code: z.string().min(1),
  description: z.string().optional(),
})

export const supplierCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export const supplierUpdateSchema = supplierCreateSchema.partial()
