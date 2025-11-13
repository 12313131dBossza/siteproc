<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?php bloginfo('description'); ?>">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header" role="banner">
    <div class="nav-container">
        <a class="brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="The Construction World Home">
            <svg class="brand-mark" width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="2" y="24" width="60" height="14" rx="4" fill="#FF0000"/>
                <path d="M10 38 L22 10 L42 10 L54 38" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
                <rect x="20" y="32" width="8" height="12" fill="#ffffff"/>
                <rect x="36" y="32" width="8" height="12" fill="#ffffff"/>
            </svg>
            <span class="brand-text">The Construction World</span>
        </a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Open menu">
            <span></span><span></span><span></span>
        </button>
        <nav class="primary-nav" id="primary-menu" role="navigation" aria-label="Primary">
            <ul>
                <li><a href="#results">Results</a></li>
                <li><a href="#specializations">Programs</a></li>
                <li><a href="#consultation">Consultation</a></li>
                <li><a href="#faq">FAQ</a></li>
            </ul>
        </nav>
        <a class="header-cta" href="#consultation" aria-label="Book a consultation">Book a Call</a>
    </div>
    <a class="skip-link" href="#main">Skip to content</a>
 </header>
