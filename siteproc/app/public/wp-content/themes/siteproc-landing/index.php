<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="SiteProc - Professional construction management platform with real-time order tracking, deliveries, expenses, and comprehensive reporting.">
    <meta name="keywords" content="construction management, project management, order tracking, delivery management, construction software">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Navigation -->
<header class="site-header">
    <div class="nav-container">
        <div class="site-logo">
            <?php if ( has_custom_logo() ) : ?>
                <?php the_custom_logo(); ?>
            <?php else : ?>
                🏗️ <span>Site</span>Proc
            <?php endif; ?>
        </div>
        
        <nav class="site-navigation">
            <ul class="nav-menu">
                <li><a href="#features">Features</a></li>
                <li><a href="#technology">Technology</a></li>
                <li><a href="#screenshots">Screenshots</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#contact" class="nav-cta">Get Started</a></li>
            </ul>
        </nav>
    </div>
</header>

<!-- Hero Section -->
<section class="hero-section">
    <div class="hero-container">
        <div class="hero-content">
            <h1 class="animate-in">
                Professional <span class="highlight">Construction Management</span> for the Modern Era
            </h1>
            <p class="animate-in delay-1">
                Manage projects, orders, deliveries, and expenses all in one powerful platform. 
                Built specifically for the U.S. construction industry.
            </p>
            
            <div class="hero-stats animate-in delay-2">
                <div class="stat-item">
                    <span class="stat-number">15+</span>
                    <span class="stat-label">Core Modules</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">50+</span>
                    <span class="stat-label">API Endpoints</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">100%</span>
                    <span class="stat-label">Secure</span>
                </div>
            </div>
            
            <div class="hero-buttons animate-in delay-3">
                <a href="#contact" class="btn btn-primary">Start Free Trial</a>
                <a href="#features" class="btn btn-secondary">Explore Features</a>
            </div>
        </div>
        
        <div class="hero-visual animate-in delay-4">
            <div class="dashboard-preview">
                <div class="screenshot-image">
                    📊
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Features Section -->
<section id="features" class="features-section">
    <div class="section-container">
        <div class="section-header">
            <span class="section-badge">FEATURES</span>
            <h2 class="section-title">Everything You Need to Manage Construction Projects</h2>
            <p class="section-description">
                Comprehensive tools designed specifically for construction professionals
            </p>
        </div>
        
        <div class="features-grid">
            <!-- Feature 1: Order Management -->
            <div class="feature-card">
                <div class="feature-icon">📦</div>
                <h3 class="feature-title">Order Management</h3>
                <p class="feature-description">
                    Create and track purchase orders with automatic status updates, delivery progress tracking, 
                    and order approval workflows.
                </p>
            </div>
            
            <!-- Feature 2: Delivery Management -->
            <div class="feature-card">
                <div class="feature-icon">🚚</div>
                <h3 class="feature-title">Delivery Management</h3>
                <p class="feature-description">
                    Record deliveries with items, quantities, and pricing. Upload proof of delivery documents 
                    and track driver information.
                </p>
            </div>
            
            <!-- Feature 3: Project Management -->
            <div class="feature-card">
                <div class="feature-icon">🏗️</div>
                <h3 class="feature-title">Project Management</h3>
                <p class="feature-description">
                    Budget tracking with real-time variance calculation, project status management, 
                    and comprehensive overview of all project costs.
                </p>
            </div>
            
            <!-- Feature 4: Financial Management -->
            <div class="feature-card">
                <div class="feature-icon">💰</div>
                <h3 class="feature-title">Financial Management</h3>
                <p class="feature-description">
                    Expense tracking with approval workflow, payment recording, and real-time 
                    financial calculations with budget variance.
                </p>
            </div>
            
            <!-- Feature 5: Reporting -->
            <div class="feature-card">
                <div class="feature-icon">📈</div>
                <h3 class="feature-title">Comprehensive Reporting</h3>
                <p class="feature-description">
                    Project financial reports, payment summaries, delivery performance metrics, 
                    and CSV export for external analysis.
                </p>
            </div>
            
            <!-- Feature 6: User Management -->
            <div class="feature-card">
                <div class="feature-icon">👥</div>
                <h3 class="feature-title">User Management</h3>
                <p class="feature-description">
                    Role-based access control (Owner, Admin, Manager, Accountant, Editor, Viewer) 
                    with company-based data isolation.
                </p>
            </div>
            
            <!-- Feature 7: Activity Logging -->
            <div class="feature-card">
                <div class="feature-icon">📋</div>
                <h3 class="feature-title">Activity Logging</h3>
                <p class="feature-description">
                    Comprehensive audit trail for all actions with filters by entity, 
                    search capabilities, and detailed metadata tracking.
                </p>
            </div>
            
            <!-- Feature 8: Security & Compliance -->
            <div class="feature-card">
                <div class="feature-icon">🔒</div>
                <h3 class="feature-title">Security & Compliance</h3>
                <p class="feature-description">
                    Row-Level Security (RLS), role enforcement, GDPR and CCPA compliance, 
                    and comprehensive privacy policies.
                </p>
            </div>
            
            <!-- Feature 9: Timezone Support -->
            <div class="feature-card">
                <div class="feature-icon">⏰</div>
                <h3 class="feature-title">Timezone Support</h3>
                <p class="feature-description">
                    All dates display in Eastern Time (ET) with automatic EST/EDT handling 
                    and timezone-aware CSV exports.
                </p>
            </div>
            
            <!-- Feature 10: Mobile Responsive -->
            <div class="feature-card">
                <div class="feature-icon">📱</div>
                <h3 class="feature-title">Mobile Responsive</h3>
                <p class="feature-description">
                    Fully responsive design (320px - 1920px+) with touch-friendly interface 
                    and adaptive layouts for all devices.
                </p>
            </div>
            
            <!-- Feature 11: Real-time Updates -->
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h3 class="feature-title">Real-time Updates</h3>
                <p class="feature-description">
                    Automatic workflow calculations, auto-sync delivery data with orders, 
                    and real-time broadcasting of changes.
                </p>
            </div>
            
            <!-- Feature 12: Document Management -->
            <div class="feature-card">
                <div class="feature-icon">📄</div>
                <h3 class="feature-title">Document Management</h3>
                <p class="feature-description">
                    Upload and manage proof of delivery (POD) documents, receipts, 
                    and other project-related files securely.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- Technology Stack Section -->
<section id="technology" class="tech-stack-section">
    <div class="section-container">
        <div class="section-header">
            <span class="section-badge">TECHNOLOGY</span>
            <h2 class="section-title">Built with Modern, Reliable Technologies</h2>
            <p class="section-description">
                Enterprise-grade tech stack for performance, security, and scalability
            </p>
        </div>
        
        <div class="tech-grid">
            <div class="tech-item">
                <div class="tech-name">Next.js 15</div>
                <div class="tech-purpose">React framework with App Router</div>
            </div>
            <div class="tech-item">
                <div class="tech-name">TypeScript</div>
                <div class="tech-purpose">Type-safe development</div>
            </div>
            <div class="tech-item">
                <div class="tech-name">Supabase</div>
                <div class="tech-purpose">PostgreSQL + Auth + Storage</div>
            </div>
            <div class="tech-item">
                <div class="tech-name">Tailwind CSS</div>
                <div class="tech-purpose">Utility-first styling</div>
            </div>
            <div class="tech-item">
                <div class="tech-name">Vercel</div>
                <div class="tech-purpose">Deployment platform</div>
            </div>
            <div class="tech-item">
                <div class="tech-name">Sentry</div>
                <div class="tech-purpose">Error tracking & monitoring</div>
            </div>
        </div>
    </div>
</section>

<!-- Screenshots Section -->
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
            <div class="screenshot-card">
                <div class="screenshot-image">📊</div>
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Dashboard Overview</h3>
                    <p class="screenshot-desc">
                        Real-time KPIs, quick actions, and recent activity at a glance
                    </p>
                </div>
            </div>
            
            <div class="screenshot-card">
                <div class="screenshot-image">📦</div>
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Orders Management</h3>
                    <p class="screenshot-desc">
                        Track all purchase orders with status updates and delivery progress
                    </p>
                </div>
            </div>
            
            <div class="screenshot-card">
                <div class="screenshot-image">🏗️</div>
                <div class="screenshot-info">
                    <h3 class="screenshot-title">Project Details</h3>
                    <p class="screenshot-desc">
                        Complete project overview with budget tracking and variance analysis
                    </p>
                </div>
            </div>
            
            <div class="screenshot-card">
                <div class="screenshot-image">💰</div>
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

<!-- CTA Section -->
<section id="contact" class="cta-section">
    <div class="cta-container">
        <h2 class="cta-title">Ready to Transform Your Construction Management?</h2>
        <p class="cta-description">
            Join construction professionals who trust SiteProc for their project management needs
        </p>
        <div class="hero-buttons">
            <a href="mailto:support@siteproc.com" class="btn btn-white">Contact Sales</a>
            <a href="https://github.com/12313131dBossza/siteproc" target="_blank" class="btn btn-secondary" 
               style="border-color: white; color: white;">
                View on GitHub
            </a>
        </div>
    </div>
</section>

<?php get_footer(); ?>
