import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: Upload proof of delivery
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supplier's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'supplier') {
      return NextResponse.json({ error: 'Not a supplier' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const deliveryId = formData.get('delivery_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!deliveryId) {
      return NextResponse.json({ error: 'No delivery ID provided' }, { status: 400 });
    }

    // Verify supplier has access to this delivery
    const { data: delivery } = await adminClient
      .from('deliveries')
      .select('id, project_id, projects:project_id(company_id)')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const { data: assignments } = await adminClient
      .from('supplier_assignments')
      .select('id, delivery_id, project_id')
      .eq('supplier_id', user.id)
      .eq('status', 'active');

    const hasAccess = assignments?.some(a => 
      a.delivery_id === deliveryId || a.project_id === delivery.project_id
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Not assigned to this delivery' }, { status: 403 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `pod-${deliveryId}-${timestamp}-${randomString}.${fileExtension}`;

    // Upload to storage
    const companyId = (delivery.projects as any)?.company_id;
    const storagePath = `${companyId}/proof-of-delivery/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('documents')
      .getPublicUrl(storagePath);

    // Update delivery with POD URL and mark as delivered
    const { data: updatedDelivery, error: updateError } = await adminClient
      .from('deliveries')
      .update({
        pod_url: urlData.publicUrl,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating delivery:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      delivery: updatedDelivery,
    });
  } catch (error: any) {
    console.error('Upload proof error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
