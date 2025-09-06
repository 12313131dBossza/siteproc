-- Assign Member Role to Specific Users
-- Run this in Supabase SQL Editor

-- Option 1: Set bossbcz@gmail.com as member (currently viewer)
UPDATE public.profiles 
SET role = 'member'
WHERE id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email = 'bossbcz@gmail.com'
);

-- Option 2: Or set thegrindsassemblyhelpme11.com as member (currently viewer)
UPDATE public.profiles 
SET role = 'member'
WHERE id IN (
    SELECT u.id FROM auth.users u 
    WHERE u.email = 'thegrindsassemble@helpme11.com'
);

-- Verification: Check updated roles
SELECT 
    u.email,
    p.role,
    p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY p.role, u.email;
