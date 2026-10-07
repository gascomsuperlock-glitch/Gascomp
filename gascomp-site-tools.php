<?php
/**
 * Plugin Name: Gascomp Site Tools
 * Description: Site header and footer for gascompsuperlock.com (rebuilt from the previous Elementor Pro design) plus a one-time security cleanup.
 * Version: 1.0.4
 * Author: Gascomp Superlock
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GST_VERSION', '1.0.4' );
define( 'GST_FILE', __FILE__ );
define( 'GST_PATH', plugin_dir_path( __FILE__ ) );
define( 'GST_URL', plugin_dir_url( __FILE__ ) );

// Disable the theme/plugin code editor in wp-admin; a compromised admin account
// would otherwise be able to drop PHP files through the dashboard.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}

require_once GST_PATH . 'includes/layout.php';
require_once GST_PATH . 'includes/cleanup.php';
require_once GST_PATH . 'includes/maintenance.php';
require_once GST_PATH . 'includes/widgets.php';
require_once GST_PATH . 'includes/forms.php';
require_once GST_PATH . 'includes/spam-cleanup.php';
require_once GST_PATH . 'includes/repair.php';
