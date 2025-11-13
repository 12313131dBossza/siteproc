/**
 * Screenshot Template - Replace Emojis with Real Images
 * 
 * This file shows you how to add real screenshots to your landing page
 */

/* ============================================
   OPTION 1: Use Images from WordPress Media Library
   ============================================ */

// Step 1: Upload images to WordPress Media Library
// Step 2: Replace emoji with this code in index.php:

/*
<!-- Dashboard Screenshot -->
<div class="screenshot-card">
    <div class="screenshot-image">
        <img src="<?php echo wp_get_attachment_url( YOUR_IMAGE_ID ); ?>" 
             alt="Dashboard Overview" 
             style="width: 100%; height: 250px; object-fit: cover; border-radius: 1rem 1rem 0 0;">
    </div>
    <div class="screenshot-info">
        <h3 class="screenshot-title">Dashboard Overview</h3>
        <p class="screenshot-desc">Real-time KPIs and project metrics</p>
    </div>
</div>
*/


/* ============================================
   OPTION 2: Use Theme Directory Images
   ============================================ */

// Step 1: Create an "images" folder in your theme
// Step 2: Upload screenshots to: wp-content/themes/siteproc-landing/images/
// Step 3: Replace emoji with this code:

/*
<!-- Dashboard Screenshot -->
<div class="screenshot-card">
    <div class="screenshot-image">
        <img src="<?php echo get_template_directory_uri(); ?>/images/dashboard.png" 
             alt="Dashboard Overview" 
             style="width: 100%; height: 250px; object-fit: cover; border-radius: 1rem 1rem 0 0;">
    </div>
    <div class="screenshot-info">
        <h3 class="screenshot-title">Dashboard Overview</h3>
        <p class="screenshot-desc">Real-time KPIs and project metrics</p>
    </div>
</div>
*/


/* ============================================
   OPTION 3: Use External URLs (Not Recommended)
   ============================================ */

// If you have images hosted elsewhere (CDN, etc.):

/*
<!-- Dashboard Screenshot -->
<div class="screenshot-card">
    <div class="screenshot-image">
        <img src="https://your-cdn.com/dashboard.png" 
             alt="Dashboard Overview" 
             style="width: 100%; height: 250px; object-fit: cover; border-radius: 1rem 1rem 0 0;">
    </div>
    <div class="screenshot-info">
        <h3 class="screenshot-title">Dashboard Overview</h3>
        <p class="screenshot-desc">Real-time KPIs and project metrics</p>
    </div>
</div>
*/


/* ============================================
   RECOMMENDED IMAGE SIZES
   ============================================ */

/*
Hero Section:
- Main image: 1200x800px
- Format: PNG or JPG
- Max size: 200KB

Feature Screenshots:
- Size: 800x600px
- Format: PNG (for UI screenshots)
- Max size: 150KB each

Dashboard Preview:
- Size: 1000x700px
- Format: PNG
- Max size: 250KB

Logo:
- Size: 200x50px (or maintain aspect ratio)
- Format: PNG (with transparency)
- Max size: 20KB
*/


/* ============================================
   SCREENSHOT LIST TO CAPTURE
   ============================================ */

/*
Recommended screenshots from your Vercel project:

1. Dashboard Overview
   - Show stat cards, recent activity, charts
   - Capture at: /dashboard

2. Orders Management
   - Show orders list with filters
   - Capture at: /orders

3. Project Details
   - Show project overview with budget tracking
   - Capture at: /projects/[id]

4. Deliveries Management
   - Show deliveries list
   - Capture at: /deliveries

5. Financial Reports
   - Show reports page with data tables
   - Capture at: /reports

6. Expenses Page
   - Show expense tracking
   - Capture at: /expenses

7. User Management
   - Show users list
   - Capture at: /users

8. Activity Log
   - Show activity timeline
   - Capture at: /activity-log
*/


/* ============================================
   HOW TO CAPTURE SCREENSHOTS
   ============================================ */

/*
Method 1: Browser Screenshot
-----------------------------
1. Open your Vercel site
2. Navigate to the page
3. Press F12 (DevTools)
4. Click device toggle (mobile/desktop icon)
5. Set resolution: 1920x1080
6. Press Ctrl+Shift+P
7. Type "screenshot"
8. Select "Capture full size screenshot"

Method 2: Snipping Tool (Windows)
----------------------------------
1. Open your page
2. Press Windows + Shift + S
3. Select area
4. Save image

Method 3: Chrome Extension
---------------------------
Use: "Full Page Screen Capture" extension
1. Install extension
2. Click extension icon
3. Download screenshot

Post-Processing:
----------------
1. Crop to 800x600px (feature screenshots)
2. Compress using TinyPNG.com
3. Save as PNG for UI, JPG for photos
4. Rename descriptively: dashboard-overview.png
*/


/* ============================================
   COMPLETE EXAMPLE - Replace in index.php
   ============================================ */

/*
<!-- Replace the entire screenshot section in index.php with this: -->

<section id="screenshots" class="screenshot-section">
    <div class="section-container">
        <div class="section-header">
            <span class="section-badge">PLATFORM PREVIEW</span>
            <h2 class="section-title">See SiteProc in Action</h2>
            <p class="section-description">
                Explore the intuitive interface designed for construction professionals
            </p>
        </div>
        
        <div class="screenshot-grid">
            <!-- Dashboard Screenshot -->
            <div class="screenshot-card">
                <img src="<?php echo get_template_directory_uri(); ?>/images/dashboard.png" 
                     alt="Dashboard Overview" 
                     style="width: 100%; height: 250px; object-fit: cover;">
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Dashboard Overview</h3>
                    <p class="screenshot-desc">
                        Real-time KPIs, quick actions, and recent activity at a glance
                    </p>
                </div>
            </div>
            
            <!-- Orders Screenshot -->
            <div class="screenshot-card">
                <img src="<?php echo get_template_directory_uri(); ?>/images/orders.png" 
                     alt="Orders Management" 
                     style="width: 100%; height: 250px; object-fit: cover;">
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Orders Management</h3>
                    <p class="screenshot-desc">
                        Track all purchase orders with status updates and delivery progress
                    </p>
                </div>
            </div>
            
            <!-- Projects Screenshot -->
            <div class="screenshot-card">
                <img src="<?php echo get_template_directory_uri(); ?>/images/projects.png" 
                     alt="Project Details" 
                     style="width: 100%; height: 250px; object-fit: cover;">
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Project Details</h3>
                    <p class="screenshot-desc">
                        Complete project overview with budget tracking and variance analysis
                    </p>
                </div>
            </div>
            
            <!-- Reports Screenshot -->
            <div class="screenshot-card">
                <img src="<?php echo get_template_directory_uri(); ?>/images/reports.png" 
                     alt="Financial Reports" 
                     style="width: 100%; height: 250px; object-fit: cover;">
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Financial Reports</h3>
                    <p class="screenshot-desc">
                        Comprehensive reporting with CSV export functionality
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>
*/


/* ============================================
   ADDING LIGHTBOX FUNCTIONALITY (OPTIONAL)
   ============================================ */

/*
If you want screenshots to open in a lightbox when clicked:

Step 1: Add this CSS to style.css:

.screenshot-card img {
    cursor: pointer;
    transition: transform 0.3s ease;
}

.screenshot-card img:hover {
    transform: scale(1.05);
}

.lightbox {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    justify-content: center;
    align-items: center;
}

.lightbox img {
    max-width: 90%;
    max-height: 90%;
    border-radius: 1rem;
}

.lightbox-close {
    position: absolute;
    top: 2rem;
    right: 2rem;
    color: white;
    font-size: 2rem;
    cursor: pointer;
}


Step 2: Add this HTML before closing body tag in index.php:

<div id="lightbox" class="lightbox" onclick="closeLightbox()">
    <span class="lightbox-close">&times;</span>
    <img id="lightbox-img" src="" alt="Screenshot">
</div>


Step 3: Add this JavaScript to js/main.js:

function openLightbox(imgSrc) {
    document.getElementById('lightbox').style.display = 'flex';
    document.getElementById('lightbox-img').src = imgSrc;
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

document.querySelectorAll('.screenshot-card img').forEach(img => {
    img.addEventListener('click', function() {
        openLightbox(this.src);
    });
});


Step 4: Update screenshot images with onclick:

<img src="..." alt="..." onclick="openLightbox(this.src)" style="cursor: pointer;">
*/
