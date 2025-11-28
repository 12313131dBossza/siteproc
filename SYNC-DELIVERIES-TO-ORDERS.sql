-- Sync existing deliveries with purchase_orders
-- Run this in Supabase SQL Editor

-- Update delivery progress based on existing deliveries
WITH delivery_totals AS (
  SELECT 
    d.order_id,
    COALESCE(SUM(COALESCE(di.qty, di.quantity, 0)), 0) as total_delivered_qty,
    COALESCE(SUM(COALESCE(di.total_price, 0)), 0) as total_delivered_value
  FROM deliveries d
  LEFT JOIN delivery_items di ON di.delivery_id = d.id
  WHERE d.order_id IS NOT NULL
  GROUP BY d.order_id
)
UPDATE purchase_orders po
SET 
  delivered_qty = dt.total_delivered_qty,
  delivered_value = dt.total_delivered_value,
  remaining_qty = GREATEST(0, COALESCE(po.quantity, po.ordered_qty, 0) - dt.total_delivered_qty),
  delivery_progress = CASE 
    WHEN dt.total_delivered_qty <= 0 THEN 'not_started'
    WHEN dt.total_delivered_qty >= COALESCE(po.quantity, po.ordered_qty, 0) AND COALESCE(po.quantity, po.ordered_qty, 0) > 0 THEN 'completed'
    ELSE 'partially_delivered'
  END,
  updated_at = NOW()
FROM delivery_totals dt
WHERE po.id = dt.order_id
  AND po.status = 'approved';

-- Show updated orders
SELECT 
  id,
  description,
  status,
  delivery_progress,
  quantity,
  ordered_qty,
  delivered_qty,
  remaining_qty,
  delivered_value
FROM purchase_orders
WHERE status = 'approved'
ORDER BY updated_at DESC
LIMIT 10;
