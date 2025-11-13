# Quick Start Guide - Elite Wealth Academy Theme

## 🚀 Activate Your Theme (3 Steps)

### Step 1: Access WordPress Admin
1. Go to: `http://siteproc.local/wp-admin/themes.php`
2. Login with your WordPress credentials

### Step 2: Activate Theme
1. Find **"Elite Wealth Academy"** in the themes list
2. Click **"Activate"**
3. Done! Your landing page is now live!

### Step 3: Customize (Optional)
Go to **Appearance → Customize** to modify:
- Hero headline & subtitle
- CTA button text  
- Video URL
- Social proof numbers

---

## 📋 What Was Created

Your new WordPress theme is located at:
```
wp-content/themes/elite-wealth-academy/
```

**Files Created:**
- ✅ `style.css` - Theme styles & metadata
- ✅ `functions.php` - WordPress functionality
- ✅ `index.php` - Main landing page
- ✅ `header.php` - Header template
- ✅ `footer.php` - Footer template
- ✅ `js/main.js` - JavaScript (countdown, testimonials, modal)
- ✅ `README.md` - Full documentation

---

## 🎨 Key Features

### Built-In Functionality
1. **Hero Section** - Full-screen with video embed
2. **Social Proof Bar** - Sticky bar with live member count
3. **Testimonials** - Auto-scrolling carousel (6 success stories)
4. **21 Skill Campuses** - Responsive grid layout
5. **Countdown Timer** - 10-minute urgency timer (auto-resets)
6. **Email Modal** - AJAX form with WordPress integration
7. **Mobile Responsive** - Optimized for all devices

### WordPress Integration
- ✅ WordPress Customizer support
- ✅ Custom post types (Testimonials, Campuses)
- ✅ AJAX email capture with nonce security
- ✅ Google Fonts integration
- ✅ SEO optimized
- ✅ Performance optimized

---

## 🔧 Next Steps

### 1. Add Screenshot (Theme Preview)
The theme needs a screenshot to show in WordPress admin:

**Option A: Take Screenshot**
1. Open your site homepage
2. Take a screenshot (1200x900px recommended)
3. Save as `screenshot.png`
4. Upload to: `wp-content/themes/elite-wealth-academy/screenshot.png`

**Option B: Use Online Tool**
- Visit [Screely.com](https://screely.com) or [Screenshot.rocks](https://screenshot.rocks)
- Upload your site screenshot
- Download and save as `screenshot.png`

### 2. Customize Content
Go to **Appearance → Customize**:
- Change "Elite Wealth Academy" to your brand name
- Update member count & earnings
- Add your YouTube video URL
- Modify CTA button text

### 3. Add Real Testimonials
**Quick Way:** Edit `index.php` (line ~50)

**WordPress Way:**
1. Go to **Testimonials → Add New** in admin
2. Add student quotes
3. Upload avatar & proof images
4. Modify `index.php` to pull from custom posts

### 4. Connect Payment
Edit `functions.php` (line ~200):
```php
// In elite_wealth_academy_capture_email() function
wp_send_json_success(array(
    'redirect' => 'https://buy.stripe.com/your-link-here'
));
```

### 5. Test Everything
- [ ] Click CTA buttons → Modal opens
- [ ] Submit email → Success message
- [ ] Testimonials auto-scroll
- [ ] Countdown timer updates
- [ ] Mobile layout works
- [ ] Video plays

---

## 🎯 View Your Site

**Frontend:** `http://siteproc.local`  
**Admin:** `http://siteproc.local/wp-admin`

---

## 💡 Pro Tips

### Increase Conversions
1. **Add Real Video** - Replace placeholder with authentic intro video
2. **Use Real Testimonials** - Get permission from actual students
3. **A/B Test Headlines** - Try different hero titles in Customizer
4. **Add Trust Badges** - Money-back guarantee, SSL secure, etc.
5. **Speed Test** - Use GTmetrix to ensure <2s load time

### Customize Colors
Edit `style.css` to change:
- Line 15: Background color
- Line 16: Text color (gold)
- Line 54: CTA button color (red)

### Add Analytics
1. Install "MonsterInsights" or "GA Google Analytics" plugin
2. Or add code to `header.php` before `<?php wp_head(); ?>`

---

## 🆘 Troubleshooting

### Theme Not Showing Up?
- Refresh WordPress admin page
- Check folder name is `elite-wealth-academy`
- Check `style.css` has theme header comment

### Video Not Loading?
- Use YouTube embed URL format: `https://www.youtube.com/embed/VIDEO_ID`
- Check video privacy settings (must be public or unlisted)

### Countdown Not Working?
- Clear browser cache
- Check browser console for JavaScript errors
- Ensure `main.js` is loading (view page source)

### Email Form Not Working?
- Check AJAX URL in browser console
- Verify nonce is passing correctly
- Check `functions.php` for PHP errors

---

## 📞 Need Help?

- **Documentation:** See `README.md` in theme folder
- **WordPress Codex:** [developer.wordpress.org](https://developer.wordpress.org)
- **Theme Files:** All customizable via WordPress Editor

---

## ✅ Launch Checklist

Before going live:
- [ ] Activate theme
- [ ] Add screenshot.png
- [ ] Customize in WordPress Customizer
- [ ] Replace placeholder video
- [ ] Add real testimonials
- [ ] Test email capture
- [ ] Connect payment processor
- [ ] Test on mobile devices
- [ ] Add analytics tracking
- [ ] Create Terms & Privacy pages
- [ ] Test full user flow

---

**🎉 You're ready to launch!**

Your high-conversion landing page is set up and ready to start capturing leads and memberships.

---

*Last updated: November 7, 2025*
