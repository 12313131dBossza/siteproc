import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile, response } from "@/lib/server-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile, supabase, error: profileError } = await getCurrentUserProfile();
    const orderId = params.id;

    if (profileError || !profile) {
      return response.error(profileError || "Unauthorized", 401);
    }

    // Get order to verify it belongs to user's company
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select("*, projects!inner(company_id)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return response.error("Order not found", 404);
    }

    // Verify company access
    if (order.projects.company_id !== profile.company_id) {
      return response.error("Access denied", 403);
    }

    // Fetch deliveries for this order with items
    // Note: Using order_uuid (new column) instead of order_id (legacy TEXT field)
    console.log("🔍 Fetching deliveries for order:", orderId);
    console.log("🏢 User company_id:", profile.company_id);
    
    let deliveries = null;
    let deliveriesError = null;

    // Try with regular client first
    const result = await supabase
      .from("deliveries")
      .select(`
        *,
        delivery_items (
          id,
          product_name,
          quantity,
          unit,
          unit_price,
          total_price
        )
      `)
      .eq("order_uuid", orderId)
      .eq("company_id", profile.company_id)
      .order("delivery_date", { ascending: false });

    deliveries = result.data;
    deliveriesError = result.error;

    console.log("📦 Deliveries query result:", {
      count: deliveries?.length || 0,
      error: deliveriesError,
      hasData: !!deliveries
    });

    // If RLS blocked it, try with a raw query
    if (deliveriesError || !deliveries || deliveries.length === 0) {
      console.log("⚠️ Primary query failed or returned empty, trying direct query...");
      
      const { data: directDeliveries, error: directError } = await supabase
        .rpc('get_order_deliveries', { 
          p_order_uuid: orderId,
          p_company_id: profile.company_id 
        })
        .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

      if (directDeliveries && !directError) {
        deliveries = directDeliveries;
        deliveriesError = null;
        console.log("✅ Direct query succeeded:", deliveries?.length);
      }
    }

    if (deliveriesError && deliveriesError.message) {
      console.error("❌ Error fetching deliveries:", deliveriesError);
    }

    // Return what we have, even if empty
    console.log("✅ Returning deliveries:", deliveries?.length || 0);
    return response.success({ deliveries: deliveries || [] });
  } catch (error) {
    console.error("Unexpected error:", error);
    return response.error("Internal server error", 500);
  }
}
