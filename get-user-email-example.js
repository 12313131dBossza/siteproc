// Method 1: Using Supabase Admin API (Server-side only)
import { createServiceClient } from './src/lib/supabase-service.js';

async function getUserEmailById(userId) {
  try {
    const supabase = createServiceClient();
    
    // Get user from auth system by ID
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    if (!user?.user?.email) {
      console.log('User not found or no email');
      return null;
    }
    
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${user.user.email}`);
    console.log(`Created: ${user.user.created_at}`);
    
    return user.user.email;
    
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Method 2: Using profiles table (if you store email there)
async function getUserEmailFromProfile(userId) {
  try {
    const supabase = createServiceClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return profile?.email;
    
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Method 3: Get all users and find by ID (less efficient)
async function findUserInList(targetUserId) {
  try {
    const supabase = createServiceClient();
    
    const { data: userList, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return null;
    }
    
    const user = userList.users.find(u => u.id === targetUserId);
    return user?.email || null;
    
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Method 4: API endpoint approach
async function createUserLookupAPI() {
  // Create this as an API endpoint: /api/user-lookup/[id]/route.ts
  
  return `
// File: src/app/api/user-lookup/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Get user from auth system
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Also get profile data if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, company_id')
      .eq('id', userId)
      .single();
    
    return NextResponse.json({
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at,
      profile: profile || null
    });
    
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}`;
}

// Example usage:
const userId = "f3be5de6-de95-4a67-8e97-6e83-21ae81e8"; // Replace with actual UUID
getUserEmailById(userId);
