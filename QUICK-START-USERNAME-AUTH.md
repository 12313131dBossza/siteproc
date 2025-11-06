# 🚀 Quick Start - Username/Password Auth

## 3-Step Setup

### 1️⃣ Database (1 minute)
```sql
-- In Supabase SQL Editor, run: add-username-to-profiles.sql
```

### 2️⃣ Supabase Auth (1 minute)
1. Go to **Supabase** → **Authentication** → **Providers**
2. Enable **Email** provider ✅
3. Click **Save**

### 3️⃣ Test (2 minutes)
```bash
npm run dev

# Visit:
http://localhost:3000/signup   # Create account
http://localhost:3000/login    # Login
```

---

## What Changed?

| Before | After |
|--------|-------|
| Magic link (OTP) login | Username + Password login |
| Email only | Username OR Email |
| No signup page | Full signup flow |
| No password reset | Forgot/Reset password |

---

## New Pages

- `/signup` - Create account
- `/login` - Sign in (updated)
- `/forgot-password` - Request reset
- `/reset-password` - Set new password

---

## Login Options

✅ **Email + Password**
```
Email: john@example.com
Password: •••••••
```

✅ **Username + Password**
```
Username: johndoe
Password: •••••••
```

---

## Files to Know

📄 **Migration:** `add-username-to-profiles.sql`
📄 **Setup Guide:** `USERNAME-PASSWORD-AUTH-SETUP.md`
📄 **Summary:** `USERNAME-PASSWORD-AUTH-SUMMARY.md`

---

**Done!** 🎉 Your app now uses username/password authentication.
