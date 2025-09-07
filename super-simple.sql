-- Super simple - just create the tables
CREATE TABLE deliveries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id text NOT NULL,
    delivery_date timestamptz DEFAULT now(),
    status text DEFAULT 'pending',
    driver_name text,
    vehicle_number text,
    notes text,
    total_amount decimal(12,2) DEFAULT 0,
    company_id uuid,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE delivery_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    quantity decimal(10,2) NOT NULL,
    unit text DEFAULT 'pieces',
    unit_price decimal(10,2) DEFAULT 0,
    total_price decimal(12,2) DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

SELECT 'Done!' as status;
