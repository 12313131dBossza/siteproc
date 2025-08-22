export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const EVENTS = {
  PO_UPDATED: 'po-updated',
  JOB_EXPENSE_UPDATED: 'job-expense-updated',
  JOB_DELIVERY_UPDATED: 'job-delivery-updated',
  JOB_COST_CODE_UPDATED: 'job-cost-code-updated',
  JOB_PO_UPDATED: 'job-po-updated',
  JOB_CHANGE_ORDER_UPDATED: 'job-change-order-updated',
  DELIVERY_UPDATED: 'delivery-updated',
  EXPENSE_UPDATED: 'expense-updated',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
