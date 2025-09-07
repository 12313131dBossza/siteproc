import { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '@/lib/supabase-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, companyId, role = 'member' } = req.body;

    if (!email || !companyId) {
      return res.status(400).json({ 
        error: 'Email and company ID are required' 
      });
    }

    const supabase = createServiceClient();

    // Find user by email
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const targetUser = (user as any).users.find((u: any) => u.email === email);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        company_id: companyId,
        role: role
      })
      .eq('id', targetUser.id)
      .select('*, companies(name)');

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `User ${email} assigned to company as ${role}`,
      user: data?.[0]
    });

  } catch (error) {
    console.error('Error assigning user to company:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
