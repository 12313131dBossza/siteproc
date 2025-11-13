# 🚀 SiteProc Landing Page - Quick Reference

## 📁 File Structure

```
siteproc-landing/
├── style.css                 # All CSS styles
├── functions.php            # WordPress functions
├── index.php               # Main landing page template
├── footer.php              # Footer template
├── js/
│   └── main.js            # JavaScript interactions
├── README.md              # Full documentation
├── INSTALLATION.md        # Installation guide
└── screenshot-template.php # Image replacement guide
```

## ⚡ Quick Actions

### Activate Theme
1. Go to: **Appearance → Themes**
2. Find: **SiteProc Landing**
3. Click: **Activate**

### Add Logo
1. Go to: **Appearance → Customize → Site Identity**
2. Upload logo (recommended: 200x50px)
3. Click: **Publish**

### Change Colors
Edit `style.css` (line 20):
```css
--primary-color: #2563eb;  /* Your brand color */
--accent-color: #f59e0b;   /* Accent color */
```

### Add Real Screenshots
1. Upload images to: `wp-content/themes/siteproc-landing/images/`
2. Replace emoji in `index.php` with:
```php
<img src="<?php echo get_template_directory_uri(); ?>/images/your-image.png">
```

### Update Contact Email
Search and replace in `index.php`:
- `support@siteproc.com` → `your@email.com`

## 🎨 Customization Hotspots

### Hero Section
**File:** `index.php` (lines 40-90)
- **Headline:** `<h1>` tag
- **Description:** `<p>` tag  
- **Stats:** `.stat-number` spans
- **CTA Buttons:** `.btn-primary` links

### Features Section
**File:** `index.php` (lines 100-300)
- **Add Feature:** Copy `.feature-card` div
- **Change Icon:** Replace emoji in `.feature-icon`
- **Edit Text:** Modify `<h3>` and `<p>` content

### Tech Stack
**File:** `index.php` (lines 310-380)
- **Add Technology:** Copy `.tech-item` div
- **Update Name:** Modify `.tech-name`
- **Update Purpose:** Modify `.tech-purpose`

### Footer
**File:** `footer.php`
- **Company Info:** `.footer-brand` section
- **Links:** `.footer-links` lists
- **Copyright:** `.footer-bottom` text

## 🎯 Key Sections & IDs

Use these IDs for navigation:
- `#features` - Features section
- `#technology` - Tech stack section
- `#screenshots` - Screenshots gallery
- `#pricing` - Pricing/CTA section (can add)
- `#contact` - Contact/CTA section

## 🔧 Common Modifications

### Change Font
1. Update Google Fonts URL in `functions.php`
2. Update `font-family` in `style.css`

### Adjust Spacing
Modify padding in sections:
```css
.features-section {
    padding: 6rem 2rem; /* Vertical, Horizontal */
}
```

### Mobile Breakpoints
- **Desktop:** 1024px+
- **Tablet:** 768px - 1023px
- **Mobile:** < 768px

Edit in `style.css` under `@media` queries.

### Animation Speed
```css
.animate-in {
    animation: fadeInUp 0.6s ease-out; /* Change 0.6s */
}
```

## 📱 Testing Checklist

- [ ] Desktop view (1920px)
- [ ] Tablet view (768px)
- [ ] Mobile view (375px)
- [ ] All links work
- [ ] Animations smooth
- [ ] Images load
- [ ] Forms work (if any)

## 🎨 Color Palette

Current colors in `style.css`:
```css
Primary Blue:   #2563eb
Dark Blue:      #1e40af
Orange Accent:  #f59e0b
Dark BG:        #0f172a
Dark Light:     #1e293b
Text Light:     #e2e8f0
Text Gray:      #94a3b8
```

## 📊 Performance Tips

1. **Compress Images:** Use TinyPNG.com
2. **Enable Caching:** Install WP Rocket
3. **Minify CSS/JS:** Use Autoptimize plugin
4. **Use CDN:** Cloudflare (free tier)

## 🐛 Quick Fixes

### Theme Not Activating
Check `style.css` has this header:
```css
/*
Theme Name: SiteProc Landing
...
*/
```

### White Screen
Check PHP errors: `wp-content/debug.log`

### Styling Broken
Clear cache: `Ctrl+Shift+R`

### JS Not Working
Check browser console (F12)

## 📞 Support

- Email: support@siteproc.com
- GitHub: https://github.com/12313131dBossza/siteproc
- Docs: See README.md

## 🎯 Next Steps

1. ✅ Activate theme
2. ✅ Add logo
3. ✅ Update contact info
4. ✅ Add real screenshots
5. ✅ Customize colors
6. ✅ Test on mobile
7. ✅ Enable caching
8. ✅ Go live!

---

**Quick Start:** Read `INSTALLATION.md`  
**Full Docs:** Read `README.md`  
**Screenshots:** Read `screenshot-template.php`
