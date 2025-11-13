=== SiteProc Landing - WordPress Theme Installation Guide ===

📋 QUICK START GUIDE
====================

This guide will help you install and activate the SiteProc Landing theme on your WordPress site.

⏱️ Estimated Time: 5 minutes

✅ PREREQUISITES
================

Before you begin, ensure you have:
1. ✅ WordPress installed and running
2. ✅ Admin access to WordPress dashboard
3. ✅ FTP access to your server (optional, for manual upload)

📦 INSTALLATION METHODS
=======================

METHOD 1: Direct Upload (Recommended)
--------------------------------------

1. **Locate Theme Folder**
   Navigate to:
   siteproc/siteproc/app/public/wp-content/themes/siteproc-landing/

2. **Verify Files**
   Ensure you have these files:
   ✅ style.css
   ✅ functions.php
   ✅ index.php
   ✅ footer.php
   ✅ js/main.js
   ✅ README.md

3. **Theme is Already Installed!**
   Since you're using the WordPress installation in the siteproc folder,
   the theme is already in the correct location.

4. **Activate Theme**
   a. Go to: http://localhost/wp-admin (or your WordPress URL)
   b. Login to WordPress
   c. Navigate to: Appearance → Themes
   d. Find "SiteProc Landing"
   e. Click "Activate"

5. **View Your Site**
   Visit your homepage to see the landing page!


METHOD 2: FTP Upload (Alternative)
-----------------------------------

If you need to upload to a different WordPress installation:

1. **Connect via FTP**
   Use FileZilla, WinSCP, or your preferred FTP client

2. **Navigate to WordPress themes folder**
   Go to: /wp-content/themes/

3. **Upload Theme Folder**
   Upload the entire "siteproc-landing" folder

4. **Set Permissions**
   - Folders: 755
   - Files: 644

5. **Activate via Dashboard**
   Follow steps 4-5 from Method 1


🎨 CUSTOMIZATION STEPS
======================

STEP 1: Add Your Logo
----------------------
1. Go to: Appearance → Customize
2. Click: Site Identity
3. Upload your logo (recommended size: 200x50px)
4. Click: Publish

STEP 2: Update Site Title
--------------------------
1. Go to: Settings → General
2. Update "Site Title" to: SiteProc
3. Update "Tagline" to: Professional Construction Management
4. Click: Save Changes

STEP 3: Set Homepage
--------------------
1. Go to: Settings → Reading
2. Select: "A static page"
3. Choose your homepage from dropdown
4. Click: Save Changes

STEP 4: Add Real Screenshots (Optional)
----------------------------------------
1. **Prepare Images**
   - Dashboard screenshot: 1200x800px
   - Feature screenshots: 800x600px
   - Save as JPG or PNG

2. **Upload to Media Library**
   - Go to: Media → Add New
   - Upload your images

3. **Edit index.php**
   Replace emoji placeholders (📊, 📦, etc.) with:
   
   ```php
   <img src="<?php echo get_template_directory_uri(); ?>/images/your-image.png" 
        alt="Description" style="width: 100%; height: auto;">
   ```

STEP 5: Customize Colors (Optional)
------------------------------------
Edit: wp-content/themes/siteproc-landing/style.css

Find (around line 20):
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #1e40af;
    --accent-color: #f59e0b;
}
```

Change to your brand colors and save.


🔧 TESTING YOUR INSTALLATION
=============================

✅ Checklist:
-------------
1. [ ] Theme appears in Appearance → Themes
2. [ ] Theme activates without errors
3. [ ] Homepage displays landing page
4. [ ] Navigation links work (scroll to sections)
5. [ ] Mobile responsive (test on phone)
6. [ ] Animations work (scroll down page)
7. [ ] Footer displays correctly
8. [ ] All sections visible

Test URLs:
----------
Homepage: http://localhost/ (or your domain)
Admin: http://localhost/wp-admin


🐛 TROUBLESHOOTING
==================

ISSUE: Theme not showing in dashboard
SOLUTION:
1. Check that style.css exists
2. Verify style.css has theme header (first 10 lines)
3. Check folder name is "siteproc-landing"

ISSUE: White screen after activation
SOLUTION:
1. Check for PHP errors in error_log
2. Ensure functions.php has no syntax errors
3. Deactivate all plugins and try again

ISSUE: Styling looks broken
SOLUTION:
1. Clear browser cache (Ctrl+Shift+R)
2. Check if style.css loaded (inspect page source)
3. Try different browser

ISSUE: JavaScript animations not working
SOLUTION:
1. Check browser console for errors (F12)
2. Verify js/main.js file exists
3. Clear cache and reload

ISSUE: Images not displaying
SOLUTION:
1. Check file paths in index.php
2. Verify images uploaded to correct folder
3. Check image file permissions (644)


📱 RESPONSIVE TESTING
=====================

Test on these screen sizes:
---------------------------
✅ Mobile: 375px (iPhone)
✅ Tablet: 768px (iPad)
✅ Desktop: 1920px (Full HD)

Tools:
------
- Chrome DevTools (F12 → Toggle device toolbar)
- Firefox Responsive Design Mode
- Real devices (recommended)


🎯 GOING LIVE
=============

Before Publishing:
------------------
1. [ ] Test all links
2. [ ] Add real screenshots
3. [ ] Update contact email addresses
4. [ ] Check spelling and grammar
5. [ ] Test on multiple browsers
6. [ ] Test on mobile devices
7. [ ] Enable caching plugin
8. [ ] Set up SSL certificate (HTTPS)
9. [ ] Configure SEO plugin (Yoast/Rank Math)
10. [ ] Submit sitemap to Google


🚀 PERFORMANCE OPTIMIZATION
============================

Recommended Plugins:
--------------------
1. WP Rocket (caching)
2. Smush (image optimization)
3. Autoptimize (CSS/JS minification)
4. Cloudflare (CDN)

Performance Checklist:
----------------------
✅ Images optimized (compressed)
✅ Caching enabled
✅ GZIP compression enabled
✅ Browser caching configured
✅ External scripts minimized


🔒 SECURITY
===========

Recommended Steps:
------------------
1. Keep WordPress updated
2. Use strong admin password
3. Install Wordfence Security plugin
4. Regular backups (UpdraftPlus)
5. Limit login attempts
6. Use SSL certificate


📊 ANALYTICS SETUP
==================

Google Analytics:
-----------------
1. Create Google Analytics account
2. Get tracking ID (G-XXXXXXXXXX)
3. Install "Insert Headers and Footers" plugin
4. Add tracking code to header

Track These Metrics:
--------------------
- Page views
- Bounce rate
- CTA clicks
- Time on page
- Mobile vs desktop traffic


📞 SUPPORT
==========

If you need help:

📧 Email: support@siteproc.com
🐙 GitHub: https://github.com/12313131dBossza/siteproc
📖 Documentation: See README.md in theme folder


✅ POST-INSTALLATION CHECKLIST
===============================

Theme Setup:
------------
[ ] Theme installed
[ ] Theme activated
[ ] Logo uploaded
[ ] Site title updated
[ ] Homepage set

Content:
--------
[ ] All sections visible
[ ] Contact email updated
[ ] GitHub links working
[ ] Footer information correct

Testing:
--------
[ ] Desktop display correct
[ ] Mobile responsive working
[ ] Tablet display correct
[ ] All links functional
[ ] Forms working (if any)
[ ] Animations smooth
[ ] Images loading

Performance:
------------
[ ] Page load < 3 seconds
[ ] Images optimized
[ ] Caching enabled
[ ] SSL certificate active

SEO:
----
[ ] Meta descriptions added
[ ] Title tags optimized
[ ] Image alt tags present
[ ] Sitemap submitted


🎉 CONGRATULATIONS!
===================

Your SiteProc landing page is now live!

Share your site and start showcasing your construction management platform.

For questions or feedback, reach out anytime.

---

Built with ❤️ for SiteProc
Professional Construction Management Platform
