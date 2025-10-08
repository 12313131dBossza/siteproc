import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await sbServer();
    const body = await request.json();

    const { transaction_type, quantity_change, unit_cost, notes } = body;

    // Get current product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const quantity_before = product.stock_quantity || 0;
    const quantity_after = quantity_before + quantity_change;

    // Prevent negative stock
    if (quantity_after < 0) {
      return NextResponse.json(
        { error: 'Cannot reduce stock below zero' },
        { status: 400 }
      );
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: quantity_after,
        last_restock_date: quantity_change > 0 ? new Date().toISOString() : product.last_restock_date,
        last_stock_count: quantity_after,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) throw updateError;

    // Log transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        product_id: params.id,
        transaction_type,
        quantity_change,
        quantity_before,
        quantity_after,
        unit_cost: unit_cost || null,
        total_cost: unit_cost ? unit_cost * Math.abs(quantity_change) : null,
        reference_type: 'manual',
        notes: notes || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        stock_quantity: quantity_after
      },
      transaction
    });
  } catch (error: any) {
    console.error('Error adjusting inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
