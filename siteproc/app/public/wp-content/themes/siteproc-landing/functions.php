<?php
/**
 * SiteProc Landing Theme Functions
 *
 * @package SiteProc_Landing
 */

// Theme Setup
function siteproc_landing_setup() {
    // Add theme support
    add_theme_support( 'title-tag' );
    add_theme_support( 'custom-logo' );
    add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
    
    // Register navigation menus
    register_nav_menus( array(
        'primary' => __( 'Primary Menu', 'siteproc-landing' ),
        'footer'  => __( 'Footer Menu', 'siteproc-landing' ),
    ) );
}
add_action( 'after_setup_theme', 'siteproc_landing_setup' );

// Enqueue Scripts and Styles
function siteproc_landing_scripts() {
    // Google Fonts
    wp_enqueue_style( 
        'siteproc-fonts', 
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap', 
        array(), 
        null 
    );
    
    // Theme stylesheet
    wp_enqueue_style( 'siteproc-style', get_stylesheet_uri(), array(), '1.0.0' );
    
    // Theme JavaScript
    wp_enqueue_script( 
        'siteproc-main', 
        get_template_directory_uri() . '/js/main.js', 
        array(), 
        '1.0.0', 
        true 
    );
}
add_action( 'wp_enqueue_scripts', 'siteproc_landing_scripts' );

// Custom Logo Setup
function siteproc_custom_logo_setup() {
    $defaults = array(
        'height'      => 50,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
        'header-text' => array( 'site-title', 'site-description' ),
    );
    add_theme_support( 'custom-logo', $defaults );
}
add_action( 'after_setup_theme', 'siteproc_custom_logo_setup' );

// Remove default WordPress styles
function siteproc_remove_default_styles() {
    wp_dequeue_style( 'wp-block-library' );
    wp_dequeue_style( 'wp-block-library-theme' );
}
add_action( 'wp_enqueue_scripts', 'siteproc_remove_default_styles', 100 );

// Customize Excerpt Length
function siteproc_excerpt_length( $length ) {
    return 25;
}
add_filter( 'excerpt_length', 'siteproc_excerpt_length' );

// Add Body Classes
function siteproc_body_classes( $classes ) {
    $classes[] = 'siteproc-landing';
    return $classes;
}
add_filter( 'body_class', 'siteproc_body_classes' );
