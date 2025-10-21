#!/usr/bin/env node

/**
 * Decode JWT token to see which Supabase project it belongs to
 * Usage: node decode-jwt.js <token>
 */

const token = process.argv[2];

if (!token) {
  console.error('Usage: node decode-jwt.js <token>');
  process.exit(1);
}

try {
  // JWT has 3 parts separated by dots
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    console.error('Invalid JWT token format');
    process.exit(1);
  }

  // Decode the payload (second part)
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  const decoded = JSON.parse(payload);

  console.log('📋 JWT Token Decoded:\n');
  console.log(JSON.stringify(decoded, null, 2));
  
  if (decoded.ref) {
    console.log(`\n✅ Supabase Project Ref: ${decoded.ref}`);
    console.log(`   Full URL should be: https://${decoded.ref}.supabase.co`);
  }
  
  if (decoded.role) {
    console.log(`✅ Token Role: ${decoded.role}`);
  }
  
} catch (err) {
  console.error('Error decoding JWT:', err.message);
  process.exit(1);
}
