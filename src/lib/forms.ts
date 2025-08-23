import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(3),
  client: z.string().min(2),
  budget: z.coerce.number().positive()
});

export const deliverySchema = z.object({
  project: z.string().min(2),
  eta: z.string().min(4),
  carrier: z.string().min(2)
});

export const expenseSchema = z.object({
  project: z.string().min(2),
  category: z.string().min(2),
  amount: z.coerce.number().positive(),
  date: z.string().min(4)
});

export const changeOrderSchema = z.object({
  project: z.string().min(2),
  amountDelta: z.coerce.number(),
  justification: z.string().min(10)
});

export const bidDecisionSchema = z.object({
  bidId: z.string().min(2),
  decision: z.enum(['accept','reject']),
  note: z.string().optional()
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ChangeOrderInput = z.infer<typeof changeOrderSchema>;
export type BidDecisionInput = z.infer<typeof bidDecisionSchema>;
