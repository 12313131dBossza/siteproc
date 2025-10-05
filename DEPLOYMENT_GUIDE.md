# 🚀 Redeploy Your SiteProc Application

## Quick Deployment Guide

Your application is deployed on Vercel (https://siteproc1.vercel.app). Here are several ways to redeploy:

---

## Method 1: Git Push (Recommended - Automatic) ⚡

If you have Git set up with Vercel:

### Windows PowerShell:
```powershell
# Check current status
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Fix orders system and database setup"

# Push to main branch (this triggers automatic deployment)
git push origin main
```

**Vercel will automatically:**
- ✅ Detect the push
- ✅ Build your application  
- ✅ Deploy to production
- ✅ You'll see it live at https://siteproc1.vercel.app in ~2-3 minutes

---

## Method 2: Vercel CLI (Manual Deploy) 🔧

If Git push doesn't work, use Vercel CLI:

### Install Vercel CLI (if not installed):
```powershell
npm install -g vercel
```

### Deploy:
```powershell
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## Method 3: Vercel Dashboard (Web UI) 🌐

1. Go to: **https://vercel.com/dashboard**
2. Find your **siteproc** project
3. Click on it
4. Go to **"Deployments"** tab
5. Click **"Redeploy"** on the latest deployment
   - OR click the **3 dots (...)** → **"Redeploy"**

---

## Method 4: Force Rebuild via Git 🔄

If you want to trigger a deployment without changes:

```powershell
# Create an empty commit
git commit --allow-empty -m "Trigger rebuild"

# Push it
git push origin main
```

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] ✅ All environment variables are set in Vercel Dashboard
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Any other required env vars

- [ ] ✅ Your `.env.local` is NOT committed (should be in `.gitignore`)

- [ ] ✅ Database migrations are run in Supabase

---

## 🔍 Check Deployment Status

### Via Terminal:
```powershell
# Check git status
git status

# View recent commits
git log --oneline -5

# Check remote URL
git remote -v
```

### Via Browser:
1. **Vercel Dashboard**: https://vercel.com/dashboard
2. Look for **"Building"** or **"Ready"** status
3. Check deployment logs for errors

---

## ⚠️ If Deployment Fails

Check the build logs:
1. Go to Vercel Dashboard
2. Click on the failed deployment
3. View **"Build Logs"**
4. Look for errors

Common issues:
- Missing environment variables
- TypeScript errors
- Build errors in code

---

## 🎯 Quick Deploy Now

Run this in PowerShell from your project directory:

```powershell
# Make sure you're in the right directory
cd C:\Users\yaibo\OneDrive\Desktop\software\siteproc

# Check if you have uncommitted changes
git status

# If you have changes, commit them
git add .
git commit -m "Update database setup and orders system"

# Push to trigger deployment
git push origin main
```

Then watch the deployment at: https://vercel.com/dashboard

---

## 📝 Notes

- **Deployment time**: Usually 2-3 minutes
- **Auto-deploys**: Enabled for `main` branch
- **Preview deploys**: Auto-created for other branches
- **Rollback**: Available in Vercel Dashboard if needed

---

## Need Help?

If deployment fails, share:
1. The error message from Vercel Dashboard
2. Or the git push error from terminal

I'll help you fix it! 🚀
