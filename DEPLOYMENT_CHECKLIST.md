# 🚀 VERCEL DEPLOYMENT CHECKLIST

## ✅ Required Environment Variables

Copy these from your `.env.local` file to Vercel:

### **Critical (Must Have):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE` - Supabase service role key (for server-side)

### **Recommended:**
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Error tracking
- [ ] `RESEND_API_KEY` - Email sending
- [ ] `EMAIL_FROM` - From email address
- [ ] `NEXT_PUBLIC_APP_URL` - Will be set after deployment

### **Optional (Can skip for now):**
- [ ] QuickBooks variables (not implemented yet)
- [ ] `DEV_AUTOLOGIN_EMAIL` (development only, don't add to production)

---

## 📝 Deployment Steps Completed:

- [ ] Step 1: Install Vercel CLI
- [ ] Step 2: Login to Vercel
- [ ] Step 3: Deploy to preview
- [ ] Step 4: Add environment variables
- [ ] Step 5: Redeploy with env vars
- [ ] Step 6: Test deployment
- [ ] Step 7: Deploy to production (optional)

---

## 🔗 URLs to Save:

- Preview URL: ____________________________
- Production URL: ____________________________
- Vercel Dashboard: https://vercel.com/dashboard

---

## 🧪 Testing Checklist:

- [ ] Homepage loads
- [ ] Sign up works
- [ ] Login works
- [ ] Dashboard loads
- [ ] Deliveries page loads
- [ ] Orders page loads
- [ ] Projects page loads
- [ ] Payments page loads
- [ ] Reports page loads
- [ ] Can create a delivery
- [ ] Can upload proof of delivery
- [ ] Can generate CSV export
- [ ] Can generate PO PDF
- [ ] Timezone shows Eastern Time (ET)
- [ ] No console errors

---

## ⚠️ Common Issues:

1. **"Missing environment variables"** → Add them in Vercel dashboard
2. **"Supabase connection failed"** → Check URL and keys are correct
3. **"RLS policy violation"** → Check Supabase policies
4. **Build failed** → Check build logs in Vercel
5. **500 errors** → Check function logs in Vercel

---

## 📞 Need Help?

Check logs: `vercel logs [deployment-url]`
