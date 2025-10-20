import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase-server';

/**
 * Health Check Endpoint
 * 
 * Returns 200 OK if service is healthy
 * Includes database connectivity check
 * Used for uptime monitoring and load balancer health checks
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check Supabase connectivity
    const supabase = await sbServer();
    
    // Simple database ping query
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const dbLatency = Date.now() - startTime;

    if (dbError) {
      console.error('Health check: Database error', dbError);
      return NextResponse.json(
        {
          status: 'degraded',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
          checks: {
            api: { status: 'ok', latency_ms: dbLatency },
            database: { status: 'error', message: dbError.message },
          },
        },
        { status: 503 }
      );
    }

    // All systems operational
    return NextResponse.json(
      {
        status: 'ok',
        message: 'All systems operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime ? Math.floor(process.uptime()) : 0,
        version: process.env.APP_VERSION || '0.1.0',
        environment: process.env.NODE_ENV || 'production',
        checks: {
          api: { status: 'ok', latency_ms: Date.now() - startTime },
          database: { status: 'ok', latency_ms: dbLatency },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        checks: {
          api: { status: 'error', latency_ms: latency },
        },
      },
      { status: 503 }
    );
  }
}

// HEAD request support (for some monitoring tools)
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
