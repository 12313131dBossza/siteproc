-- Create a function to fetch deliveries (bypasses RLS)
CREATE OR REPLACE FUNCTION get_order_deliveries(
  p_order_uuid UUID,
  p_company_id UUID
)
RETURNS TABLE (
  id UUID,
  order_uuid UUID,
  order_id TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  status delivery_status,
  driver_name TEXT,
  vehicle_number TEXT,
  notes TEXT,
  total_amount NUMERIC,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  delivery_items JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.order_uuid,
    d.order_id,
    d.delivery_date,
    d.status,
    d.driver_name,
    d.vehicle_number,
    d.notes,
    d.total_amount,
    d.company_id,
    d.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', di.id,
          'product_name', di.product_name,
          'quantity', di.quantity,
          'unit', di.unit,
          'unit_price', di.unit_price,
          'total_price', di.total_price
        )
      ) FILTER (WHERE di.id IS NOT NULL),
      '[]'::json
    )::jsonb as delivery_items
  FROM deliveries d
  LEFT JOIN delivery_items di ON di.delivery_id = d.id
  WHERE d.order_uuid = p_order_uuid
    AND d.company_id = p_company_id
  GROUP BY d.id, d.order_uuid, d.order_id, d.delivery_date, d.status, 
           d.driver_name, d.vehicle_number, d.notes, d.total_amount, 
           d.company_id, d.created_at
  ORDER BY d.delivery_date DESC;
END;
$$;

-- Test the function
SELECT * FROM get_order_deliveries(
  '49fd1a08-a4f2-401f-9468-26c4b665f287'::UUID,
  '1e2e7ccf-29fa-4511-b0d3-93c8347ead33'::UUID
);
