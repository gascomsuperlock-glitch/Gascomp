<?php
/**
 * Plugin Name: Gascomp Site Tools
 * Description: Site header and footer for gascompsuperlock.com (rebuilt from the previous Elementor Pro design) plus a one-time security cleanup.
 * Version: 1.1.0
 * Author: Gascomp Superlock
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GST_VERSION', '1.1.0' );
define( 'GST_FILE', __FILE__ );
define( 'GST_PATH', plugin_dir_path( __FILE__ ) );
define( 'GST_URL', plugin_dir_url( __FILE__ ) );

// Disable the theme/plugin code editor in wp-admin; a compromised admin account
// would otherwise be able to drop PHP files through the dashboard.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}

/**
 * Git deploys replace the plugin files without telling any cache. Purge the
 * LiteSpeed page cache and Elementor's generated CSS once per plugin version.
 */
function gst_purge_on_upgrade() {
	if ( get_option( 'gst_installed_version' ) === GST_VERSION ) {
		return;
	}
	update_option( 'gst_installed_version', GST_VERSION, false );
	if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->files_manager ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	do_action( 'litespeed_purge_all' );
	if ( function_exists( 'gst_debug_log' ) ) {
		gst_debug_log( 'upgraded to ' . GST_VERSION . ': purged LiteSpeed and Elementor caches' );
	}
}
add_action( 'wp_loaded', 'gst_purge_on_upgrade', 30 );

require_once GST_PATH . 'includes/layout.php';
require_once GST_PATH . 'includes/cleanup.php';
require_once GST_PATH . 'includes/maintenance.php';
require_once GST_PATH . 'includes/widgets.php';
require_once GST_PATH . 'includes/forms.php';
require_once GST_PATH . 'includes/spam-cleanup.php';
require_once GST_PATH . 'includes/repair.php';
