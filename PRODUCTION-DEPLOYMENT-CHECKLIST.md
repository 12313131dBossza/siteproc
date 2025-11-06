# 🚀 Production Deployment Checklist - Username/Password Auth

## Production URL
**Live Site:** https://siteproc1.vercel.app

---

## ✅ Step-by-Step Deployment

### 📋 **STEP 1: Run Database Migration** (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your **production** Supabase project (the one connected to siteproc1.vercel.app)

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **+ New Query**

3. **Copy & Paste Migration**
   - Open file: `add-username-to-profiles.sql`
   - Copy ALL contents
   - Paste into SQL Editor

4. **Execute Migration**
   - Click **Run** (or press Ctrl+Enter)
   - Wait for ✅ Success message
   - Verify output shows:
     ```
     ✅ Added username column to profiles table
     ✅ Added full_name column to profiles table
     ✅ VERIFICATION
     ✅ INDEXES
     ```

5. **Verify Columns Exist**
   - In SQL Editor, run:
     ```sql
     SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'profiles' 
     AND column_name IN ('username', 'full_name');
     ```
   - Should return 2 rows

**✅ CHECKPOINT:** Database migration complete

---

### 🔐 **STEP 2: Enable Email Authentication** (3 minutes)

1. **Open Supabase Auth Settings**
   - In Supabase Dashboard
   - Click **Authentication** → **Providers**

2. **Enable Email Provider**
   - Find **Email** in the list
   - Toggle to **Enabled** ✅
   
3. **Configure Settings**
   - **Confirm email:** 
     - ❌ Disabled (for easier testing initially)
     - ✅ Enabled (recommended for production after testing)
   - **Secure email change:** ✅ Enabled
   - **Minimum password length:** 6 (default is fine)

4. **Save Settings**
   - Click **Save** button
   - Wait for confirmation

5. **Verify Email Templates (Optional)**
   - Click **Email Templates** tab
   - Check templates exist for:
     - Confirm signup
     - Reset password
     - Magic link (can ignore - not using)

**✅ CHECKPOINT:** Email authentication enabled

---

### 📤 **STEP 3: Deploy to Vercel** (2 minutes)

1. **Check Git Status**
   ```powershell
   git status
   ```
   - Should show modified/new files

2. **Stage All Changes**
   ```powershell
   git add .
   ```

3. **Commit Changes**
   ```powershell
   git commit -m "feat: Add username/password authentication with signup and password reset"
   ```

4. **Push to GitHub**
   ```powershell
   git push origin main
   ```

5. **Monitor Vercel Deployment**
   - Go to: https://vercel.com
   - Open **siteproc** project
   - Watch deployment progress
   - Wait for ✅ "Deployment ready"
   - Typical time: 1-3 minutes

**✅ CHECKPOINT:** Code deployed to production

---

### 🧪 **STEP 4: Test on Production** (10 minutes)

#### Test 1: Signup Flow
1. **Open Production Site**
   - Visit: https://siteproc1.vercel.app/signup

2. **Create Test Account**
   - Full Name: `Test User`
   - Username: `testuser001` (use unique username)
   - Email: `your-email+test@gmail.com` (use + trick for testing)
   - Password: `TestPass123`
   - Confirm Password: `TestPass123`
   - Click **Sign up**

3. **Verify Signup**
   - Should redirect to `/login`
   - Should see success message

**✅ Test 1 Result:** _____ (Pass/Fail)

---

#### Test 2: Login with Email
1. **Go to Login**
   - Visit: https://siteproc1.vercel.app/login

2. **Enter Credentials**
   - Email or Username: `your-email+test@gmail.com`
   - Password: `TestPass123`
   - Click **Sign in**

3. **Verify Login**
   - Should redirect to `/dashboard`
   - Should see your name/email displayed

**✅ Test 2 Result:** _____ (Pass/Fail)

---

#### Test 3: Logout and Login with Username
1. **Logout**
   - Click logout button in dashboard

2. **Login with Username**
   - Visit: https://siteproc1.vercel.app/login
   - Email or Username: `testuser001`
   - Password: `TestPass123`
   - Click **Sign in**

3. **Verify Login**
   - Should redirect to `/dashboard`
   - Should be logged in successfully

**✅ Test 3 Result:** _____ (Pass/Fail)

---

#### Test 4: Remember Me Feature
1. **Logout Again**

2. **Login with Remember Me**
   - Visit: https://siteproc1.vercel.app/login
   - Email or Username: `testuser001`
   - Password: `TestPass123`
   - ✅ Check "Remember me"
   - Click **Sign in**

3. **Test Session Persistence**
   - Close browser completely
   - Reopen browser
   - Visit: https://siteproc1.vercel.app/dashboard
   - Should still be logged in

**✅ Test 4 Result:** _____ (Pass/Fail)

---

#### Test 5: Forgot Password Flow
1. **Logout**

2. **Request Password Reset**
   - Visit: https://siteproc1.vercel.app/forgot-password
   - Enter email: `your-email+test@gmail.com`
   - Click **Send reset link**
   - Check email inbox

3. **Check Email**
   - Should receive password reset email
   - Click the reset link in email

4. **Reset Password**
   - Should land on `/reset-password`
   - Enter new password: `NewPass123`
   - Confirm: `NewPass123`
   - Click **Reset password**

5. **Login with New Password**
   - Should redirect to `/login`
   - Login with new password: `NewPass123`
   - Verify successful login

**✅ Test 5 Result:** _____ (Pass/Fail)

---

#### Test 6: Error Handling
1. **Test Invalid Login**
   - Visit: https://siteproc1.vercel.app/login
   - Enter: wrong username/email
   - Enter: wrong password
   - Should see error: "Invalid username/email or password"

2. **Test Duplicate Username**
   - Visit: https://siteproc1.vercel.app/signup
   - Try to use existing username: `testuser001`
   - Should see error: "Username already taken"

3. **Test Password Mismatch**
   - Visit: https://siteproc1.vercel.app/signup
   - Enter different passwords in password/confirm
   - Should see error: "Passwords do not match"

**✅ Test 6 Result:** _____ (Pass/Fail)

---

### 🎉 **STEP 5: Post-Deployment Tasks**

#### Optional: Enable Email Confirmation
If you want users to confirm their email:

1. **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. **Confirm email:** ✅ Enable
3. **Save**
4. Update redirect URL in Supabase → **Auth** → **URL Configuration**
   - Site URL: `https://siteproc1.vercel.app`
   - Redirect URLs: `https://siteproc1.vercel.app/auth/callback`

#### Update Existing Users (if any)
If you have existing users from magic link auth:

```sql
-- In Supabase SQL Editor
-- Generate usernames from emails for existing users
UPDATE public.profiles 
SET username = LOWER(REPLACE(split_part(email, '@', 1), '.', '_'))
WHERE username IS NULL;

-- Send password reset emails to existing users
-- (Do this via Supabase Dashboard → Authentication → Users → Actions)
```

#### Monitor Production
- Check Vercel logs for errors
- Check Supabase Auth logs
- Monitor signup/login activity

---

## 📊 Deployment Summary

**Date:** November 6, 2025
**Production URL:** https://siteproc1.vercel.app
**Supabase Project:** [Your project name]

### Changes Deployed:
- ✅ Username/password authentication
- ✅ Signup page
- ✅ Updated login page
- ✅ Forgot password flow
- ✅ Reset password flow
- ✅ Database schema updates

### Tests Performed:
- [ ] Signup
- [ ] Login with email
- [ ] Login with username
- [ ] Remember me
- [ ] Forgot password
- [ ] Error handling

**Deployment Status:** _____ (Success/Failed)

**Notes:**
_______________________________________________________________________
_______________________________________________________________________
_______________________________________________________________________

---

## 🆘 Troubleshooting

### Issue: Migration fails with "column already exists"
**Solution:** Columns already added, safe to continue

### Issue: Can't enable Email provider
**Solution:** Check if you have billing enabled (may be required)

### Issue: Deployment failed on Vercel
**Solution:** 
- Check build logs in Vercel dashboard
- Ensure no TypeScript errors
- Check environment variables are set

### Issue: Login not working after deployment
**Solution:**
1. Check browser console for errors
2. Verify Supabase URL in environment variables
3. Check Supabase Auth logs for failed attempts
4. Clear browser cookies and try again

### Issue: Password reset email not received
**Solution:**
1. Check spam folder
2. Verify email provider is enabled
3. Check Supabase → Auth → Email Templates
4. Test with different email address

---

## 📞 Quick Links

- **Production Site:** https://siteproc1.vercel.app
- **Vercel Dashboard:** https://vercel.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Setup Guide:** See `USERNAME-PASSWORD-AUTH-SETUP.md`

---

**Ready to deploy?** Follow the steps above in order! ✅
