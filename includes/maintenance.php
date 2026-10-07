<?php
/**
 * Second one-time maintenance pass (plugin 1.0.1).
 *
 * - Restores the WordPress permalink rules that were lost from .htaccess, which
 *   made every inner page answer with HTTP 404 while still rendering.
 * - Re-adds a small hardening block to .htaccess.
 * - Neutralises administrator accounts created during the intrusion without
 *   deleting them, so the owner can still review them.
 *
 * Results are appended to wp-content/gascomp-site-tools.log.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GST_MAINTENANCE_FLAG = 'gst_maintenance_v2_done';

/** Logins with fabricated addresses, created between June and September 2026. */
function gst_rogue_admin_logins() {
	return array( 'backup_49988ddf6a', 'bot', 'mono26076' );
}

function gst_security_htaccess_lines() {
	return array(
		'Options -Indexes',
		'<Files wp-config.php>',
		'	<IfModule mod_litespeed.c>',
		'		Order allow,deny',
		'		Deny from all',
		'	</IfModule>',
		'</Files>',
		'<Files xmlrpc.php>',
		'	<IfModule mod_litespeed.c>',
		'		Order allow,deny',
		'		Deny from all',
		'	</IfModule>',
		'</Files>',
		'<IfModule mod_rewrite.c>',
		'	RewriteEngine On',
		'	RewriteRule ^wp\-content/uploads/.*\.(?:php[1-7]?|pht|phtml?|phps)\.?$ - [NC,F]',
		'</IfModule>',
	);
}

function gst_run_maintenance() {
	if ( get_option( GST_MAINTENANCE_FLAG ) ) {
		return;
	}
	if ( ! add_option( GST_MAINTENANCE_FLAG, current_time( 'mysql', true ), '', false ) ) {
		return;
	}

	$log   = array();
	$log[] = 'Gascomp Site Tools maintenance ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';

	// 1. .htaccess: hardening block first, then the WordPress permalink block.
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/misc.php';
	$htaccess = ABSPATH . '.htaccess';
	$before   = is_file( $htaccess ) ? filesize( $htaccess ) : 0;
	$ok       = insert_with_markers( $htaccess, 'Gascomp Security', gst_security_htaccess_lines() );
	$log[]    = ( $ok ? 'wrote' : 'FAILED to write' ) . ' Gascomp Security block to .htaccess';
	flush_rewrite_rules( true );
	clearstatcache();
	$contents = is_file( $htaccess ) ? (string) file_get_contents( $htaccess ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions
	$log[]    = '.htaccess size ' . $before . ' -> ' . strlen( $contents ) . ' bytes; WordPress rules ' . ( false !== strpos( $contents, 'RewriteRule . /index.php [L]' ) ? 'present' : 'MISSING' );

	// 2. Let LiteSpeed Cache put its own rules back, if it exposes the method.
	try {
		if ( class_exists( '\LiteSpeed\Activation' ) && method_exists( '\LiteSpeed\Activation', 'cls' ) ) {
			$activation = \LiteSpeed\Activation::cls();
			if ( method_exists( $activation, 'update_files' ) ) {
				$activation->update_files();
				$log[] = 'asked LiteSpeed Cache to rewrite its .htaccess rules';
			}
		}
		do_action( 'litespeed_purge_all' );
	} catch ( \Throwable $e ) {
		$log[] = 'LiteSpeed rule refresh skipped: ' . $e->getMessage();
	}

	// 3. Rogue administrators: strip the role, scramble the password, end sessions.
	foreach ( gst_rogue_admin_logins() as $login ) {
		$user = get_user_by( 'login', $login );
		if ( ! $user ) {
			$log[] = 'user absent: ' . $login;
			continue;
		}
		$user->set_role( '' );
		wp_set_password( wp_generate_password( 40, true, true ), $user->ID );
		WP_Session_Tokens::get_instance( $user->ID )->destroy_all();
		if ( class_exists( 'WP_Application_Passwords' ) ) {
			WP_Application_Passwords::delete_all_application_passwords( $user->ID );
		}
		$log[] = 'NEUTRALISED administrator (role removed, password scrambled, sessions ended): ' . $login . ' (#' . $user->ID . ')';
	}

	// 4. End every other login session too; legitimate users simply sign in again.
	WP_Session_Tokens::destroy_all_for_all_users();
	$log[] = 'ended all login sessions';

	// 5. Drop active-plugin entries whose main file no longer exists.
	$active  = (array) get_option( 'active_plugins', array() );
	$present = array();
	foreach ( $active as $plugin ) {
		if ( is_file( WP_PLUGIN_DIR . '/' . $plugin ) ) {
			$present[] = $plugin;
		} else {
			$log[] = 'removed missing plugin from active list: ' . $plugin;
		}
	}
	if ( count( $present ) !== count( $active ) ) {
		update_option( 'active_plugins', $present );
	}

	$admins = get_users( array( 'role' => 'administrator', 'fields' => array( 'user_login' ) ) );
	$log[]  = 'administrators now: ' . implode( ', ', wp_list_pluck( $admins, 'user_login' ) );

	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
/**
 * Third pass (plugin 1.0.2): the owner does not recognise the "tio" administrator
 * and now manages the site alone, so that account loses access as well.
 */
function gst_run_maintenance_v3() {
	if ( get_option( 'gst_maintenance_v3_done' ) ) {
		return;
	}
	if ( ! add_option( 'gst_maintenance_v3_done', current_time( 'mysql', true ), '', false ) ) {
		return;
	}

	$log   = array();
	$log[] = 'Gascomp Site Tools maintenance ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';
	$user  = get_user_by( 'login', 'tio' );
	if ( ! $user ) {
		$log[] = 'user absent: tio';
	} else {
		$user->set_role( '' );
		wp_set_password( wp_generate_password( 40, true, true ), $user->ID );
		WP_Session_Tokens::get_instance( $user->ID )->destroy_all();
		if ( class_exists( 'WP_Application_Passwords' ) ) {
			WP_Application_Passwords::delete_all_application_passwords( $user->ID );
		}
		$log[] = 'NEUTRALISED administrator (role removed, password scrambled, sessions ended): tio (#' . $user->ID . ')';
	}
	$admins = get_users( array( 'role' => 'administrator', 'fields' => array( 'user_login' ) ) );
	$log[]  = 'administrators now: ' . implode( ', ', wp_list_pluck( $admins, 'user_login' ) );

	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
add_action( 'wp_loaded', 'gst_run_maintenance_v3', 21 );

// wp_loaded: every post type and taxonomy is registered, so the flushed rules are complete.
add_action( 'wp_loaded', 'gst_run_maintenance', 20 );
