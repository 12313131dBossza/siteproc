# 🏢 Company Creation Guide

## 📋 **3 Ways to Create a Company**

---

### **Option 1: SQL Script (Quickest - For Existing Users)**

Use this if you already have an account and just need a company created.

**File:** `CREATE-COMPANY-FROM-EMAIL.sql`

**Steps:**
1. Open the file
2. Find this line: `user_email := 'your-email@example.com';`
3. Replace with your actual email
4. Copy and run in Supabase SQL Editor
5. It will:
   - Create a company based on your email domain
   - Assign you as the owner
   - Set up your profile

**Example:**
- Email: `john@acmecorp.com`
- Company created: `"Acmecorp"`
- Role: `owner`

---

### **Option 2: Enhanced Signup Page (Best for New Users)**

New signup page that creates company automatically!

**URL:** `/signup-with-company`

**Features:**
- ✅ Creates company during signup
- ✅ Auto-suggests company name from email domain
- ✅ You can edit the company name
- ✅ Makes you the owner automatically
- ✅ All in one step!

**How it works:**
1. Visit: `https://siteproc1.vercel.app/signup-with-company`
2. Enter your details:
   - Full Name
   - Email (e.g., `john@acmecorp.com`)
   - Company Name (auto-filled as "Acmecorp", but editable)
   - Username
   - Password
3. Click "Sign up"
4. Company and account created together!

---

### **Option 3: Manual SQL in Supabase**

Quick manual creation in Supabase SQL Editor:

```sql
-- 1. Create your company
INSERT INTO public.companies (name, created_at)
VALUES ('Your Company Name', now())
RETURNING id;

-- 2. Copy the returned ID and use it below
-- Replace YOUR-USER-ID and COMPANY-ID-FROM-ABOVE
UPDATE public.profiles
SET 
  company_id = 'COMPANY-ID-FROM-ABOVE'::uuid,
  role = 'owner'
WHERE email = 'your-email@example.com';
```

---

## 🚀 **RECOMMENDED APPROACH**

### **For Existing Users:**
1. Run `CREATE-COMPANY-FROM-EMAIL.sql` 
2. Update your email in the script
3. Run in Supabase
4. Login again

### **For New Users:**
1. Use the enhanced signup page: `/signup-with-company`
2. Company created automatically during registration

---

## ✅ **After Creating Company**

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Logout completely**
3. **Login again** at `/login`
4. **Dashboard should load** without "No company found" error!

---

## 📝 **What Gets Created:**

| Field | Value |
|-------|-------|
| Company Name | From email domain or custom |
| Your Role | `owner` (full access) |
| Company ID | Auto-generated UUID |
| Profile | Linked to company |

---

## 🔍 **Verify It Worked:**

Run this in Supabase SQL Editor:

```sql
SELECT 
  p.email,
  p.username,
  p.role,
  c.name as company_name
FROM public.profiles p
JOIN public.companies c ON p.company_id = c.id
WHERE p.email = 'your-email@example.com';
```

Should show your profile with company assigned!

---

## 💡 **Tips:**

- **Company name** is extracted from email domain by default
  - `admin@acme.com` → Company: "Acme"
  - `john@construction-co.com` → Company: "Construction-co"
  
- You can change the company name anytime

- First user of a company becomes the **owner**

- You can invite other users later and they'll join your company

---

## 🆘 **Still Having Issues?**

If dashboard still shows "No company found":

1. Run `DIAGNOSTIC-CHECK.sql` to see current state
2. Check if `company_id` is set in your profile
3. Try clearing cache and logging in again
4. Check browser console for errors

---

**Files:**
- `CREATE-COMPANY-FROM-EMAIL.sql` - Automated company creation script
- `signup-with-company/page.tsx` - Enhanced signup with company creation
- `MANUAL-FIX.sql` - Emergency fix if nothing else works
