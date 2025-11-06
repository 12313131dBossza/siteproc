# 🔐 USERNAME & PASSWORD AUTHENTICATION SETUP GUIDE

This guide explains how to enable username/password authentication in SiteProc and configure Supabase accordingly.

## 📋 Overview

We've migrated from **magic link (OTP) authentication** to **username/password authentication**. Users can now:
- Sign up with username, email, and password
- Log in using either username OR email + password
- Reset forgotten passwords
- Choose "Remember Me" for extended sessions

---

## ✅ What Was Changed

### 1. Database Schema
- **Added `username` column** to `profiles` table (unique, case-insensitive)
- **Added `full_name` column** to `profiles` table (for display names)
- **Created unique index** on username for fast lookups

**Migration File:** `add-username-to-profiles.sql`

### 2. Login Page (`/login`)
**File:** `src/app/(auth)/login/page.tsx`

**Changes:**
- ✅ Replaced email-only field with "Email or Username" field
- ✅ Added password input field with show/hide toggle
- ✅ Changed authentication method from `signInWithOtp()` to `signInWithPassword()`
- ✅ Added username → email lookup for username-based logins
- ✅ Added "Forgot password?" link
- ✅ Added "Sign up" link to registration page
- ✅ Improved error messages

### 3. Registration Page (`/signup`)
**File:** `src/app/(auth)/signup/page.tsx`

**Features:**
- ✅ Full name input
- ✅ Username input (validated, lowercase, unique)
- ✅ Email input
- ✅ Password input (min 6 characters, show/hide toggle)
- ✅ Confirm password validation
- ✅ Username availability check
- ✅ Auto-creates profile with username
- ✅ Redirects to login after successful signup

### 4. Authentication Flow
**Files:** `src/middleware.ts`, `src/app/auth/callback/page.tsx`

**Status:** ✅ Already compatible with password auth
- Middleware checks `supabase.auth.getUser()` - works with any auth method
- Callback page handles both token-based and password-based flows

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Run this SQL in **Supabase SQL Editor**:

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Paste contents of: add-username-to-profiles.sql
# 4. Run query
```

This will:
- Add `username` and `full_name` columns to `profiles` table
- Create unique index on username
- Verify the changes

### Step 2: Configure Supabase Auth Settings

Go to **Supabase Dashboard** → **Authentication** → **Providers**:

#### ✅ Enable Email Provider (Password Auth)
1. Navigate to: **Authentication** → **Providers** → **Email**
2. **Enable Email provider**: ✅ Enabled
3. **Confirm email**: Choose your preference
   - Recommended: ✅ Enabled (for production)
   - Development: ❌ Disabled (faster testing)
4. **Secure email change**: ✅ Enabled (recommended)
5. Click **Save**

#### ❌ Disable Magic Link (Optional but Recommended)
If you want to **completely disable magic links**:

1. Go to **Authentication** → **Providers** → **Email**
2. Scroll to **Email Templates**
3. Find **Magic Link** template
4. You can either:
   - **Option A:** Disable magic link entirely in code (remove OTP endpoints)
   - **Option B:** Keep it enabled as a backup login method

**Note:** With current setup, magic links won't be used since login page uses password auth.

### Step 3: Update Environment Variables

Ensure your `.env.local` has:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### Step 4: Update Existing Users (Optional)

If you have existing users from the magic link system, you'll need to:

1. **Set passwords for existing users:**
   ```sql
   -- In Supabase Dashboard → Authentication → Users
   -- Click on each user → "Send Password Recovery Email"
   -- Or use the Supabase API to bulk update
   ```

2. **Add usernames to existing profiles:**
   ```sql
   -- Option 1: Let users set their own usernames on first login
   -- Option 2: Generate usernames from emails
   UPDATE public.profiles 
   SET username = LOWER(split_part(email, '@', 1))
   WHERE username IS NULL;
   
   -- Ensure uniqueness by adding numbers to duplicates
   -- (This is a simplified example - implement proper logic)
   ```

### Step 5: Test the Setup

1. **Test Signup:**
   - Go to `/signup`
   - Create a new account with username, email, and password
   - Verify redirect to login page

2. **Test Login with Email:**
   - Go to `/login`
   - Enter email + password
   - Verify successful login

3. **Test Login with Username:**
   - Go to `/login`
   - Enter username + password
   - Verify successful login

4. **Test Remember Me:**
   - Login with "Remember me" checked
   - Close browser and reopen
   - Verify session persists

---

## 📁 File Structure

```
src/app/(auth)/
├── login/
│   └── page.tsx          ← Updated for username/password
├── signup/
│   └── page.tsx          ← NEW registration page
└── forgot-password/
    └── page.tsx          ← TODO: Create password reset page

add-username-to-profiles.sql  ← Database migration
```

---

## 🔒 Security Features

✅ **Password Requirements:**
- Minimum 6 characters (enforced by Supabase)
- Can be strengthened in Supabase Auth settings

✅ **Username Validation:**
- 3+ characters required
- Only letters, numbers, hyphens, and underscores
- Case-insensitive (stored as lowercase)
- Unique constraint enforced at database level

✅ **Session Management:**
- "Remember Me" creates extended sessions
- Regular sessions expire when browser closes
- Secure httpOnly cookies

✅ **Rate Limiting:**
- Already implemented in middleware
- Protects against brute force attacks

---

## 🎨 Next Steps (Optional Enhancements)

### 1. Password Reset Page
Create `src/app/(auth)/forgot-password/page.tsx`:
- Request password reset email
- Handle password reset with token
- Redirect back to login

### 2. Profile Settings
Allow users to:
- Change username
- Change password
- Update email
- View security settings

### 3. Email Verification
Enable email confirmation:
- Supabase → Auth → Email → Confirm email ✅
- Add email verification check on protected pages
- Show "Please verify your email" banner

### 4. Social Login (Optional)
Add Google/GitHub/etc. login:
- Supabase → Auth → Providers → Enable desired providers
- Add social login buttons to login/signup pages

### 5. Two-Factor Authentication (2FA)
Implement 2FA:
- Use Supabase's built-in MFA support
- Add 2FA setup in user settings
- Require 2FA for admin users

---

## 🐛 Troubleshooting

### Issue: "Username already taken" on signup
**Cause:** Username is not unique
**Solution:** Choose a different username

### Issue: "Username not found" on login
**Cause:** User entered username instead of email, but username doesn't exist
**Solution:** 
- Check if username is correct
- Try logging in with email instead
- Ensure database migration was run

### Issue: Password login not working
**Cause:** Email provider not enabled in Supabase
**Solution:**
1. Go to Supabase → Authentication → Providers
2. Enable Email provider
3. Save settings

### Issue: Session not persisting with "Remember Me"
**Cause:** Cookie settings or browser restrictions
**Solution:**
- Check browser allows cookies
- Verify `.env.local` has correct `NEXT_PUBLIC_APP_URL`
- Check Supabase → Auth → URL Configuration

---

## 📊 Migration Checklist

- [x] Add `username` and `full_name` columns to `profiles` table
- [x] Create unique index on username
- [x] Update login page for username/email + password
- [x] Create signup page
- [x] Test login with email + password
- [x] Test login with username + password
- [x] Test signup flow
- [ ] Enable email confirmation in Supabase (optional)
- [ ] Create password reset page
- [ ] Migrate existing users (if applicable)
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Test in production environment

---

## 🔗 Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Password Best Practices](https://owasp.org/www-project-passwords/)

---

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Logs → Auth logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure database migration was successful

---

**Last Updated:** November 6, 2025
**Version:** 1.0.0
