<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'local' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'root' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          '6[.XVhF6.FoRqAI&)Hdo^m?11rZt7od&Z|n#BgKD*;~pmM4&M>=ou(Xw4i0co]7J' );
define( 'SECURE_AUTH_KEY',   '9]x}OS(nXT?%J Mn5%>ND+DZ]7NBc[gcc5UE@YCU#4_nJ=E6P.@4S_oH1 KAA[PB' );
define( 'LOGGED_IN_KEY',     'pm7us7MZ&{5g!oZ-Vsrz]v7tr_d,kJaC)]HMRiDkO%1_w{(x/nCV24j/$t@H,M7X' );
define( 'NONCE_KEY',         '6*+XogVMJR`fh^ u>KhvF%nT[Z<X?y5 4C<B9$s,}_jedmpvu0]Ot)o1;/w3o_{T' );
define( 'AUTH_SALT',         '-,) QJ=~afFYbw5/:_z|0~=g{(C}rIR?))H6e{MMd6;$hNxC9YHER`N5$]x1APs7' );
define( 'SECURE_AUTH_SALT',  '>laY?Vs>~r8190%[e#Hl{W4<)8H:_0S-7D;<9P{#U:G{[@1Irt%Ci(MC:yw*oEEe' );
define( 'LOGGED_IN_SALT',    'mquY3AFn&cnne|mbx]hfu-hH,k{5UF0,x?:grg`X(^t]W64s_|huUIY65lF`OG}=' );
define( 'NONCE_SALT',        'YQ>>H)a--bUVV97tA2{3Rik|b;>1Ol`Ubc90KG>8KE%&1D[SdZ@P_:0:(uaG(wIx' );
define( 'WP_CACHE_KEY_SALT', 'f]bLMh9z3m,Vap-:E.=C#<tb|`rf?6N_B<s[ot4h<G{L$,ZnpBldIhOi-xJ]A# D' );


/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';


/* Add any custom values between this line and the "stop editing" line. */



/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
if ( ! defined( 'WP_DEBUG' ) ) {
	define( 'WP_DEBUG', false );
}

define( 'WP_ENVIRONMENT_TYPE', 'local' );
/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
