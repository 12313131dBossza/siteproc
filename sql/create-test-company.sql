-- Create a test company for joining
-- Run this in your Supabase SQL Editor

-- Insert a test company that you can join
INSERT INTO public.companies (id, name) 
VALUES ('1e2e7ccf-29fa-4511-b0d3-93c8347ead33', 'Test Company for Joining')
ON CONFLICT (id) DO NOTHING;

-- Check if the company was created
SELECT * FROM public.companies WHERE id = '1e2e7ccf-29fa-4511-b0d3-93c8347ead33';
