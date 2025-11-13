# Elite Wealth Academy WordPress Theme

A high-conversion WordPress theme for membership landing pages, inspired by The Real World (TRW) design principles.

## Installation

1. **Upload Theme**
   - Go to WordPress Admin → Appearance → Themes → Add New
   - Click "Upload Theme" 
   - Select the `elite-wealth-academy.zip` file (or upload via FTP to `/wp-content/themes/`)
   - Click "Install Now"

2. **Activate Theme**
   - After installation, click "Activate"
   - Your landing page will be live immediately!

## Features

✅ **Fully WordPress Integrated**
- Works with WordPress Customizer
- Custom post types for Testimonials & Campuses
- AJAX email capture with WordPress security
- Google Fonts integration
- Optimized for speed

✅ **Conversion-Optimized Elements**
- Hero section with video embed
- Sticky social proof bar
- Auto-scrolling testimonials
- 21 skill campuses grid
- Countdown urgency timer
- Email capture modal
- Multiple CTAs

✅ **Customizable via WordPress Customizer**
- Hero title & subtitle
- CTA button text
- Video URL
- Member count
- Total earnings
- Campus count

## Customization

### Via WordPress Customizer
Go to **Appearance → Customize** to modify:

1. **Hero Section**
   - Hero Title
   - Hero Subtitle
   - Video URL (YouTube embed)

2. **Call to Action**
   - CTA Button Text (e.g., "Join For $49/Month")

3. **Social Proof**
   - Member Count
   - Total Earnings
   - Campus Count

### Via Code

**Change Colors**: Edit `style.css`
- Background: `#000000` (black)
- Gold accent: `#D4AF37`
- Red CTA: `#FF0000`

**Modify Testimonials**: Edit `index.php` (line ~50)
- Add/remove testimonials from the array
- Or use custom post type "Testimonials"

**Update Campuses**: Edit `index.php` (line ~105)
- Modify the campuses array
- Or use custom post type "Campuses"

## Custom Post Types

The theme includes two custom post types for easy management:

### Testimonials
- Go to **Testimonials → Add New**
- Add student name as title
- Add quote in content editor
- Set featured image as avatar
- Add proof screenshot in content

### Campuses
- Go to **Campuses → Add New**
- Add campus name as title
- Add description in content editor
- Use custom fields for icons

## Email Capture Setup

The theme captures emails via AJAX. To connect to your email service:

**Option 1: Database Storage**
- Emails are ready for WordPress integration
- Add custom database table in `functions.php`

**Option 2: Mailchimp Integration**
Install a plugin like "MC4WP: Mailchimp for WordPress"

**Option 3: Custom Integration**
Edit `functions.php` → `elite_wealth_academy_capture_email()` function

## Payment Integration

To connect Stripe/PayPal checkout:

1. Edit `functions.php` line ~200
2. In `elite_wealth_academy_capture_email()`, add redirect:
```php
wp_send_json_success(array(
    'redirect' => 'https://buy.stripe.com/your-payment-link'
));
```

Or create a WordPress page for checkout and redirect there.

## File Structure

```
elite-wealth-academy/
├── style.css          # Theme styles & metadata
├── functions.php      # WordPress functions
├── index.php          # Main landing page template
├── header.php         # Header template
├── footer.php         # Footer template
├── js/
│   └── main.js       # JavaScript functionality
├── screenshot.png     # Theme preview image
└── README.md         # This file
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Load time: <2 seconds
- Mobile-optimized
- SEO-friendly
- No heavy dependencies

## Support

For theme support or customization:
- Email: support@yoursite.com
- Documentation: See main README-landing.md

## Changelog

### Version 1.0.0 (November 2025)
- Initial release
- Full WordPress integration
- Customizer support
- Custom post types
- AJAX email capture

## License

GPL v2 or later

## Credits

- Design inspiration: The Real World (TRW)
- Font: Google Fonts (Roboto)
- Images: Unsplash, Placeholder.com
