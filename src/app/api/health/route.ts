import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Comprehensive Health & Diagnostics Endpoint
 * 
 * Returns detailed diagnostic information about system health
 * Checks: environment, auth, database, tables, endpoints
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    supabase: {},
    database: {},
    endpoints: {}
  };

  try {
    // Check environment variables
    diagnostics.environment = {
      url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_role_set: !!process.env.SUPABASE_SERVICE_ROLE,
      node_env: process.env.NODE_ENV
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing Supabase configuration',
        diagnostics
      }, { status: 500 });
    }

    // Create Supabase client
    console.log('[health] Connecting to Supabase...');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error('[health] Error setting cookies:', error);
          }
        },
      },
    });

    // Test 1: Auth check
    console.log('[health] Testing auth...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    diagnostics.supabase.auth = {
      connected: !authError,
      user_exists: !!user,
      user_email: user?.email,
      error: authError?.message
    };

    // Test 2: Check if tables exist and are accessible
    console.log('[health] Testing table access...');
    const tablesToCheck = ['profiles', 'orders', 'projects', 'deliveries'];
    const tableStatus: any = {};

    for (const table of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);
        
        tableStatus[table] = {
          accessible: !error,
          count: count || 0,
          error: error?.message
        };
        console.log(`[health] Table ${table}:`, tableStatus[table]);
      } catch (e: any) {
        tableStatus[table] = {
          accessible: false,
          error: e.message
        };
      }
    }

    diagnostics.database.tables = tableStatus;

    // Test 3: Orders endpoint
    console.log('[health] Testing orders query...');
    try {
      const { data: ordersData, error: ordersError, count: ordersCount } = await supabase
        .from('orders')
        .select('id, description, amount, status', { count: 'exact' })
        .limit(5);
      
      diagnostics.endpoints.orders = {
        success: !ordersError,
        count: ordersCount || 0,
        error: ordersError?.message,
        sample_count: ordersData?.length || 0
      };
      console.log('[health] Orders:', diagnostics.endpoints.orders);
    } catch (e: any) {
      diagnostics.endpoints.orders = { error: e.message };
    }

    // Test 4: Projects endpoint
    console.log('[health] Testing projects query...');
    try {
      const { data: projectsData, error: projectsError, count: projectsCount } = await supabase
        .from('projects')
        .select('id, name, code', { count: 'exact' })
        .limit(5);
      
      diagnostics.endpoints.projects = {
        success: !projectsError,
        count: projectsCount || 0,
        error: projectsError?.message,
        sample_count: projectsData?.length || 0
      };
      console.log('[health] Projects:', diagnostics.endpoints.projects);
    } catch (e: any) {
      diagnostics.endpoints.projects = { error: e.message };
    }

    // Test 5: Deliveries endpoint
    console.log('[health] Testing deliveries query...');
    try {
      const { data: deliveriesData, error: deliveriesError, count: deliveriesCount } = await supabase
        .from('deliveries')
        .select('id, status, total_amount', { count: 'exact' })
        .limit(5);
      
      diagnostics.endpoints.deliveries = {
        success: !deliveriesError,
        count: deliveriesCount || 0,
        error: deliveriesError?.message,
        sample_count: deliveriesData?.length || 0
      };
      console.log('[health] Deliveries:', diagnostics.endpoints.deliveries);
    } catch (e: any) {
      diagnostics.endpoints.deliveries = { error: e.message };
    }

    const latency = Date.now() - startTime;
    console.log('[health] Diagnostics complete in', latency, 'ms');

    return NextResponse.json({
      status: 'ok',
      message: 'Health check complete',
      latency_ms: latency,
      diagnostics
    });

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('[health] Unexpected error:', error);
    diagnostics.error = error.message;

    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      latency_ms: latency,
      diagnostics
    }, { status: 500 });
  }
}

// HEAD request support
export async function HEAD(request: NextRequest) {
  try {
    const supabase = await sbServer();
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return new NextResponse(null, { status: 503 });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
