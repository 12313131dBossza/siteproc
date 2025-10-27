import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user's company_id
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Fetch expenses grouped by category
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    // Group by category and sum amounts
    const categoryMap = new Map<string, number>();
    
    (expenses || []).forEach((expense) => {
      const category = expense.category || 'Uncategorized';
      const amount = Number(expense.amount) || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });

    // Convert to array format for charts
    const result = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Expenses by category error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense categories' },
      { status: 500 }
    );
  }
}
