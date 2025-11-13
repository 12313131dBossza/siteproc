<?php
/**
 * The Construction World Theme Functions
 * 
 * @package The_Construction_World
 * @since 1.0.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme Setup
 */
function elite_wealth_academy_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('custom-logo');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
    
    // Add custom image sizes
    add_image_size('testimonial-avatar', 60, 60, true);
    add_image_size('testimonial-proof', 280, 150, true);
}
add_action('after_setup_theme', 'elite_wealth_academy_setup');

/**
 * Enqueue Scripts and Styles
 */
function elite_wealth_academy_scripts() {
    // Google Fonts
    wp_enqueue_style(
        'elite-wealth-academy-fonts',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap',
        array(),
        null
    );
    
    // Theme stylesheet
    wp_enqueue_style(
        'elite-wealth-academy-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get('Version')
    );
    
    // Theme JavaScript
    wp_enqueue_script(
        'elite-wealth-academy-script',
        get_template_directory_uri() . '/js/main.js',
        array(),
        wp_get_theme()->get('Version'),
        true
    );
    
    // Pass PHP variables to JavaScript
    wp_localize_script('elite-wealth-academy-script', 'ewaData', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('ewa_nonce'),
        'memberCount' => get_theme_mod('member_count', '247892'),
    ));
}
add_action('wp_enqueue_scripts', 'elite_wealth_academy_scripts');

/**
 * Create JavaScript Directory and File
 */
function elite_wealth_academy_create_js_file() {
    $js_dir = get_template_directory() . '/js';
    if (!file_exists($js_dir)) {
        wp_mkdir_p($js_dir);
    }
}
add_action('after_switch_theme', 'elite_wealth_academy_create_js_file');

/**
 * Customizer Settings
 */
function elite_wealth_academy_customize_register($wp_customize) {
    // Hero Section
    $wp_customize->add_section('hero_section', array(
        'title' => __('Hero Section', 'elite-wealth-academy'),
        'priority' => 30,
    ));
    
    $wp_customize->add_setting('hero_title', array(
        'default' => 'Escape The Matrix – Join Elite Wealth Academy',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    
    $wp_customize->add_control('hero_title', array(
        'label' => __('Hero Title', 'elite-wealth-academy'),
        'section' => 'hero_section',
        'type' => 'text',
    ));
    
    $wp_customize->add_setting('hero_subtitle', array(
        'default' => 'Learn from millionaire mentors in 21 proven skills. Master wealth-building strategies used by the top 1%.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    
    $wp_customize->add_control('hero_subtitle', array(
        'label' => __('Hero Subtitle', 'elite-wealth-academy'),
        'section' => 'hero_section',
        'type' => 'textarea',
    ));
    
    $wp_customize->add_setting('video_url', array(
        'default' => 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'sanitize_callback' => 'esc_url_raw',
    ));
    
    $wp_customize->add_control('video_url', array(
        'label' => __('Video URL (YouTube Embed)', 'elite-wealth-academy'),
        'section' => 'hero_section',
        'type' => 'url',
    ));
    
    // CTA Settings
    $wp_customize->add_section('cta_section', array(
        'title' => __('Call to Action', 'elite-wealth-academy'),
        'priority' => 31,
    ));
    
    $wp_customize->add_setting('cta_text', array(
        'default' => 'Join For $49/Month',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    
    $wp_customize->add_control('cta_text', array(
        'label' => __('CTA Button Text', 'elite-wealth-academy'),
        'section' => 'cta_section',
        'type' => 'text',
    ));
    
    // Social Proof Settings
    $wp_customize->add_section('social_proof_section', array(
        'title' => __('Social Proof', 'elite-wealth-academy'),
        'priority' => 32,
    ));
    
    $wp_customize->add_setting('member_count', array(
        'default' => '247,892',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    
    $wp_customize->add_control('member_count', array(
        'label' => __('Member Count', 'elite-wealth-academy'),
        'section' => 'social_proof_section',
        'type' => 'text',
    ));
    
    $wp_customize->add_setting('earnings_total', array(
        'default' => '$1.2B+',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    
    $wp_customize->add_control('earnings_total', array(
        'label' => __('Total Earnings', 'elite-wealth-academy'),
        'section' => 'social_proof_section',
        'type' => 'text',
    ));
    
    $wp_customize->add_setting('campus_count', array(
        'default' => '21',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    
    $wp_customize->add_control('campus_count', array(
        'label' => __('Campus Count', 'elite-wealth-academy'),
        'section' => 'social_proof_section',
        'type' => 'text',
    ));
}
add_action('customize_register', 'elite_wealth_academy_customize_register');

/**
 * AJAX Handler for Email Capture
 */
function elite_wealth_academy_capture_email() {
    check_ajax_referer('ewa_nonce', 'nonce');
    
    $email = sanitize_email($_POST['email']);
    
    if (!is_email($email)) {
        wp_send_json_error(array('message' => 'Invalid email address'));
    }
    
    // Save to database or send to email service
    // Example: Save as WordPress user meta or custom table
    
    // For now, just return success
    wp_send_json_success(array(
        'message' => 'Email captured successfully',
        'redirect' => home_url('/checkout') // Change to your checkout page
    ));
}
add_action('wp_ajax_capture_email', 'elite_wealth_academy_capture_email');
add_action('wp_ajax_nopriv_capture_email', 'elite_wealth_academy_capture_email');

/**
 * Add Custom Post Type for Testimonials (Optional)
 */
function elite_wealth_academy_testimonials_post_type() {
    $labels = array(
        'name' => 'Testimonials',
        'singular_name' => 'Testimonial',
        'menu_name' => 'Testimonials',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Testimonial',
        'edit_item' => 'Edit Testimonial',
        'new_item' => 'New Testimonial',
        'view_item' => 'View Testimonial',
        'search_items' => 'Search Testimonials',
        'not_found' => 'No testimonials found',
        'not_found_in_trash' => 'No testimonials found in trash'
    );
    
    $args = array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-format-quote',
        'supports' => array('title', 'editor', 'thumbnail'),
        'has_archive' => false,
    );
    
    register_post_type('testimonial', $args);
}
add_action('init', 'elite_wealth_academy_testimonials_post_type');

/**
 * Add Custom Post Type for Campuses (Optional)
 */
function elite_wealth_academy_campuses_post_type() {
    $labels = array(
        'name' => 'Campuses',
        'singular_name' => 'Campus',
        'menu_name' => 'Campuses',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Campus',
        'edit_item' => 'Edit Campus',
        'new_item' => 'New Campus',
        'view_item' => 'View Campus',
        'search_items' => 'Search Campuses',
        'not_found' => 'No campuses found',
        'not_found_in_trash' => 'No campuses found in trash'
    );
    
    $args = array(
        'labels' => $labels,
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-welcome-learn-more',
        'supports' => array('title', 'editor'),
        'has_archive' => false,
    );
    
    register_post_type('campus', $args);
}
add_action('init', 'elite_wealth_academy_campuses_post_type');

/**
 * Security: Remove WordPress Version
 */
remove_action('wp_head', 'wp_generator');

/**
 * Optimize Performance
 */
function elite_wealth_academy_optimize() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
}
add_action('init', 'elite_wealth_academy_optimize');
