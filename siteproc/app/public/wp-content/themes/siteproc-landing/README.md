# SiteProc Landing Theme

> Professional WordPress landing page theme for SiteProc Construction Management Platform

## 🎯 Overview

This is a custom WordPress theme designed specifically as a landing page for **SiteProc** - a professional construction management platform. The theme showcases the platform's features, technology stack, and benefits in a modern, responsive design.

## ✨ Features

- **Modern Design**: Clean, professional design with gradient accents and smooth animations
- **Fully Responsive**: Optimized for all devices (mobile, tablet, desktop)
- **Performance Optimized**: Lightweight code with minimal dependencies
- **SEO Friendly**: Proper semantic HTML and meta tags
- **Smooth Animations**: Intersection Observer API for scroll-triggered animations
- **Interactive Elements**: Hover effects, parallax scrolling, and smooth navigation

## 📁 File Structure

```
siteproc-landing/
├── style.css           # Main theme styles with all CSS
├── functions.php       # WordPress theme functions
├── index.php          # Main template file (landing page)
├── footer.php         # Footer template
├── js/
│   └── main.js        # JavaScript for interactions
└── README.md          # This file
```

## 🚀 Installation

### 1. Upload Theme

Upload the `siteproc-landing` folder to:
```
wp-content/themes/siteproc-landing/
```

### 2. Activate Theme

1. Go to WordPress Admin → **Appearance** → **Themes**
2. Find "SiteProc Landing"
3. Click **Activate**

### 3. Access Your Landing Page

Visit your WordPress site homepage to see the landing page!

## 🎨 Customization

### Change Colors

Edit the CSS variables in `style.css` (line 20-30):

```css
:root {
    --primary-color: #2563eb;      /* Main blue color */
    --secondary-color: #1e40af;    /* Darker blue */
    --accent-color: #f59e0b;       /* Orange accent */
    --dark: #0f172a;               /* Dark background */
    --text-light: #e2e8f0;         /* Light text */
}
```

### Update Content

Edit `index.php` to modify:
- Hero section text
- Feature descriptions
- Technology stack items
- Screenshots
- Call-to-action text

### Add Your Logo

1. Go to WordPress Admin → **Appearance** → **Customize**
2. Click on **Site Identity**
3. Upload your logo under **Logo**
4. Save changes

### Modify Navigation

The navigation menu can be customized in `index.php`:
```html
<ul class="nav-menu">
    <li><a href="#features">Features</a></li>
    <li><a href="#technology">Technology</a></li>
    <!-- Add more menu items here -->
</ul>
```

## 📸 Adding Real Screenshots

Replace the placeholder emoji icons with actual images:

1. **Upload Images**: Add your screenshots to the WordPress Media Library

2. **Update HTML** in `index.php`:

```html
<!-- Before (placeholder) -->
<div class="screenshot-image">📊</div>

<!-- After (real image) -->
<img src="<?php echo get_template_directory_uri(); ?>/images/dashboard.png" 
     alt="Dashboard" class="screenshot-image" 
     style="width: 100%; height: auto; object-fit: cover;">
```

3. **Recommended Image Sizes**:
   - Hero image: 1200x800px
   - Screenshots: 800x600px
   - Feature icons: 128x128px

## 🎯 Section Breakdown

### Hero Section
- Large headline with gradient text
- Key statistics (15+ modules, 50+ endpoints, 100% secure)
- Primary and secondary CTA buttons
- Dashboard preview image

### Features Section
- 12 feature cards with icons
- Order Management, Delivery Management, Project Management, etc.
- Hover effects on cards

### Technology Stack Section
- 6 technology badges
- Next.js, TypeScript, Supabase, Tailwind CSS, Vercel, Sentry

### Screenshots Section
- 4 screenshot cards with descriptions
- Dashboard, Orders, Projects, Reports

### CTA Section
- Final call-to-action with gradient background
- Contact and GitHub buttons

### Footer
- 4-column layout: Brand, Product, Company, Resources
- Links to documentation and social media
- Copyright and tagline

## 🔧 Advanced Customization

### Add New Feature Card

In `index.php`, add within the `.features-grid`:

```html
<div class="feature-card">
    <div class="feature-icon">🎯</div>
    <h3 class="feature-title">Your Feature Title</h3>
    <p class="feature-description">
        Your feature description here.
    </p>
</div>
```

### Modify Animations

Edit animation timing in `style.css`:

```css
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
/* Add more delays as needed */
```

### Change Fonts

Update the Google Fonts import in `functions.php`:

```php
wp_enqueue_style( 
    'siteproc-fonts', 
    'https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap'
);
```

Then update the font-family in `style.css`:

```css
body {
    font-family: 'YourFont', sans-serif;
}
```

## 📱 Responsive Breakpoints

- **Desktop**: 1024px and above (full layout)
- **Tablet**: 768px - 1023px (2-column grids)
- **Mobile**: Below 768px (single column)

## 🌟 Performance Tips

1. **Optimize Images**: Use WebP format and compress images
2. **Lazy Loading**: Add `loading="lazy"` to images below the fold
3. **Minify CSS/JS**: Use a WordPress caching plugin
4. **CDN**: Consider using a CDN for static assets

## 🔒 Security

- No external dependencies (except Google Fonts)
- No jQuery required (vanilla JavaScript)
- WordPress security best practices followed
- Escaped output where needed

## 🐛 Troubleshooting

### Theme Not Showing Up

1. Check that all files are in the correct directory
2. Ensure `style.css` has proper theme header
3. Check file permissions (644 for files, 755 for directories)

### Animations Not Working

1. Clear browser cache
2. Check browser console for JavaScript errors
3. Ensure `main.js` is loading (check Network tab in DevTools)

### Styling Issues

1. Clear WordPress cache (if using a caching plugin)
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check for CSS conflicts with plugins

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Hero section with gradient design
- 12 feature cards
- Technology stack section
- Screenshot gallery
- Responsive design
- Smooth animations
- Interactive JavaScript

## 🙏 Credits

- **Design**: Custom design for SiteProc
- **Icons**: Emoji icons (can be replaced with custom icons)
- **Fonts**: Inter from Google Fonts
- **Framework**: WordPress theme architecture

## 📞 Support

For questions or issues with this theme:

- **Email**: support@siteproc.com
- **GitHub**: https://github.com/12313131dBossza/siteproc
- **Documentation**: See main project README

## 📄 License

Proprietary - All rights reserved. This theme is part of the SiteProc project.

---

**Built with ❤️ for the construction industry**

**Made for SiteProc - Professional Construction Management Platform**
