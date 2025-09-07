// NEXT.JS API EXAMPLE FOR SUPABASE SUPPORT
// File: src/app/api/supabase-user-demo/route.ts
// This demonstrates user lookup patterns in a Next.js environment

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;

// Service client (bypasses RLS, has admin access)
const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Regular client (respects RLS)
const anonClient = createClient(supabaseUrl, anonKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const demo = searchParams.get('demo') || 'all';
  
  if (!userId) {
    return NextResponse.json({ 
      error: 'userId parameter required',
      example: '/api/supabase-user-demo?userId=35a57302-cfec-48ef-b964-b28448ee68c4'
    }, { status: 400 });
  }
  
  const results: any = {
    userId,
    timestamp: new Date().toISOString(),
    methods: {}
  };
  
  // Method 1: Auth Admin API
  if (demo === 'all' || demo === 'auth') {
    try {
      console.log('Testing auth.admin.getUserById...');
      const { data: authUser, error } = await serviceClient.auth.admin.getUserById(userId);
      
      results.methods.authAdmin = {
        success: !error && !!authUser?.user,
        error: error?.message,
        data: authUser?.user ? {
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          last_sign_in_at: authUser.user.last_sign_in_at
        } : null
      };
    } catch (err: any) {
      results.methods.authAdmin = {
        success: false,
        error: err.message,
        data: null
      };
    }
  }
  
  // Method 2: Profiles table
  if (demo === 'all' || demo === 'profiles') {
    try {
      console.log('Testing profiles table query...');
      const { data: profile, error } = await serviceClient
        .from('profiles')
        .select('id, email, full_name, role, company_id')
        .eq('id', userId)
        .single();
      
      results.methods.profiles = {
        success: !error && !!profile,
        error: error?.message,
        data: profile
      };
    } catch (err: any) {
      results.methods.profiles = {
        success: false,
        error: err.message,
        data: null
      };
    }
  }
  
  // Method 3: Combined approach
  if (demo === 'all' || demo === 'combined') {
    try {
      console.log('Testing combined auth + profiles...');
      
      // Get auth data
      const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId);
      
      if (authError || !authUser?.user) {
        results.methods.combined = {
          success: false,
          error: authError?.message || 'User not found in auth system',
          data: null
        };
      } else {
        // Get profile data
        const { data: profile, error: profileError } = await serviceClient
          .from('profiles')
          .select('full_name, role, company_id')
          .eq('id', userId)
          .single();
        
        // Get company name if available
        let companyName = null;
        if (profile?.company_id) {
          const { data: company } = await serviceClient
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .single();
          companyName = company?.name;
        }
        
        results.methods.combined = {
          success: true,
          error: null,
          data: {
            // Auth system data
            id: authUser.user.id,
            email: authUser.user.email,
            created_at: authUser.user.created_at,
            email_confirmed_at: authUser.user.email_confirmed_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            
            // Profile data
            profile: profile ? {
              full_name: profile.full_name,
              role: profile.role,
              company_id: profile.company_id,
              company_name: companyName
            } : null,
            
            profileError: profileError?.message || null
          }
        };
      }
    } catch (err: any) {
      results.methods.combined = {
        success: false,
        error: err.message,
        data: null
      };
    }
  }
  
  // Method 4: List all users approach
  if (demo === 'all' || demo === 'list') {
    try {
      console.log('Testing listUsers approach...');
      const { data: userList, error } = await serviceClient.auth.admin.listUsers();
      
      if (error) {
        results.methods.listUsers = {
          success: false,
          error: error.message,
          data: null
        };
      } else {
        const user = userList.users.find((u: any) => u.id === userId);
        results.methods.listUsers = {
          success: !!user,
          error: user ? null : 'User not found in list',
          data: user ? {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          } : null,
          totalUsers: userList.users.length
        };
      }
    } catch (err: any) {
      results.methods.listUsers = {
        success: false,
        error: err.message,
        data: null
      };
    }
  }
  
  // Add environment info
  results.environment = {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: supabaseUrl,
    hasServiceKey: !!serviceKey,
    hasAnonKey: !!anonKey
  };
  
  // Add summary
  const successfulMethods = Object.entries(results.methods)
    .filter(([_, result]: [string, any]) => result.success)
    .map(([method, _]) => method);
  
  results.summary = {
    totalMethods: Object.keys(results.methods).length,
    successfulMethods: successfulMethods.length,
    recommendedMethod: successfulMethods.includes('authAdmin') ? 'authAdmin' : 
                      successfulMethods.includes('combined') ? 'combined' : 
                      successfulMethods[0] || 'none',
    email: results.methods.authAdmin?.data?.email || 
           results.methods.combined?.data?.email ||
           results.methods.profiles?.data?.email ||
           results.methods.listUsers?.data?.email ||
           'Not found'
  };
  
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, email } = body;
    
    if (action === 'list-all-users') {
      const { data: userList, error } = await serviceClient.auth.admin.listUsers();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      const users = userList.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at
      }));
      
      return NextResponse.json({
        totalUsers: users.length,
        users
      });
    }
    
    if (action === 'find-by-email' && email) {
      const { data: userList, error } = await serviceClient.auth.admin.listUsers();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      const user = userList.users.find((u: any) => u.email === email);
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
