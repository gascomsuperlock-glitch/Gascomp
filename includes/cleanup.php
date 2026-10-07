<?php
/**
 * One-time security cleanup, run on activation (or on the first request after
 * deployment if the activation hook did not fire).
 *
 * Every action is logged to wp-content/gascomp-site-tools.log and to the
 * gst_cleanup_report option. Nothing here touches wp-config.php, the database
 * schema, or any file outside the explicit allow-lists below.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GST_CLEANUP_FLAG = 'gst_cleanup_v1_done';

/** Files known to be leftovers of the January 2025 import or of the intrusion. */
function gst_files_to_delete() {
	$root  = untrailingslashit( ABSPATH );
	$files = array(
		$root . '/tioshop.sql',
		$root . '/tioshop-sankcjs378d38d.zip',
		$root . '/load.php',
		$root . '/.htaccess.bk',
		WP_CONTENT_DIR . '/plugins/woocommerce.9.5.1.zip',
	);
	// Hostinger-style auto-login helpers must not stay in the web root.
	foreach ( (array) glob( $root . '/create_autologin_*.php' ) as $autologin ) {
		$files[] = $autologin;
	}
	return $files;
}

/** Fake plugin folders found with only zero-byte PHP files inside. */
function gst_dirs_to_delete() {
	return array(
		WP_CONTENT_DIR . '/plugins/lumen-archiver-io',
		WP_CONTENT_DIR . '/plugins/titan-store-run',
		WP_CONTENT_DIR . '/plugins/site-tools-dbb9dabf0cdc46ab',
		WP_CONTENT_DIR . '/plugins/easypost',
		WP_CONTENT_DIR . '/easypost',
	);
}

/** True when every regular file under $dir is empty, so deleting it cannot lose data. */
function gst_dir_has_only_empty_files( $dir ) {
	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);
	foreach ( $iterator as $entry ) {
		if ( $entry->isFile() && $entry->getSize() > 0 ) {
			return false;
		}
	}
	return true;
}

function gst_rmdir_recursive( $dir ) {
	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);
	foreach ( $iterator as $entry ) {
		if ( $entry->isDir() ) {
			rmdir( $entry->getPathname() );
		} else {
			unlink( $entry->getPathname() );
		}
	}
	return rmdir( $dir );
}

function gst_run_cleanup() {
	if ( get_option( GST_CLEANUP_FLAG ) ) {
		return;
	}
	// Claim the flag first so two concurrent requests cannot both run.
	if ( ! add_option( GST_CLEANUP_FLAG, current_time( 'mysql', true ), '', false ) ) {
		return;
	}

	$log   = array();
	$log[] = 'Gascomp Site Tools cleanup ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';
	$log[] = 'Context: ' . ( defined( 'WP_CLI' ) && WP_CLI ? 'wp-cli' : 'web request' );

	// 1. Files.
	foreach ( gst_files_to_delete() as $file ) {
		if ( ! is_file( $file ) ) {
			$log[] = 'file absent: ' . $file;
			continue;
		}
		$size  = filesize( $file );
		$ok    = unlink( $file );
		$log[] = ( $ok ? 'deleted file: ' : 'FAILED to delete file: ' ) . $file . ' (' . $size . ' bytes)';
	}

	// 2. Fake plugin folders.
	foreach ( gst_dirs_to_delete() as $dir ) {
		if ( ! is_dir( $dir ) ) {
			$log[] = 'dir absent: ' . $dir;
			continue;
		}
		if ( ! gst_dir_has_only_empty_files( $dir ) ) {
			$log[] = 'SKIPPED dir (contains non-empty files, review manually): ' . $dir;
			continue;
		}
		$ok    = gst_rmdir_recursive( $dir );
		$log[] = ( $ok ? 'deleted dir: ' : 'FAILED to delete dir: ' ) . $dir;
	}

	// 3. Users.
	require_once ABSPATH . 'wp-admin/includes/user.php';
	$users  = get_users( array( 'fields' => 'all', 'number' => 500 ) );
	$admins = array();
	$log[]  = 'users total: ' . count( $users );
	foreach ( $users as $user ) {
		$roles = implode( ',', (array) $user->roles );
		$log[] = sprintf( 'user #%d login=%s email=%s roles=%s registered=%s', $user->ID, $user->user_login, $user->user_email, $roles, $user->user_registered );
		if ( in_array( 'administrator', (array) $user->roles, true ) ) {
			$admins[] = $user;
		}
	}
	$owner = get_user_by( 'login', 'gascomp-admin' );
	foreach ( $users as $user ) {
		if ( 'superadmin' !== $user->user_login ) {
			continue;
		}
		$reassign = ( $owner && $owner->ID !== $user->ID ) ? $owner->ID : null;
		$ok       = wp_delete_user( $user->ID, $reassign );
		$log[]    = ( $ok ? 'DELETED hidden user: ' : 'FAILED to delete user: ' ) . $user->user_login . ' (#' . $user->ID . ')' . ( $reassign ? ', content reassigned to #' . $reassign : '' );
	}
	foreach ( $admins as $admin ) {
		if ( 'gascomp-admin' !== $admin->user_login && 'superadmin' !== $admin->user_login ) {
			$log[] = 'REVIEW other administrator: ' . $admin->user_login . ' <' . $admin->user_email . '>';
		}
	}

	// 4. Settings that attackers commonly tamper with.
	foreach ( array( 'siteurl', 'home', 'admin_email', 'users_can_register', 'default_role' ) as $option ) {
		$log[] = 'option ' . $option . ' = ' . wp_json_encode( get_option( $option ) );
	}
	$log[] = 'active_plugins = ' . implode( ', ', (array) get_option( 'active_plugins' ) );
	$log[] = 'stylesheet = ' . get_option( 'stylesheet' );

	// 5. Persist.
	update_option( 'gst_cleanup_report', $log, false );
	$path = WP_CONTENT_DIR . '/gascomp-site-tools.log';
	file_put_contents( $path, implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
register_activation_hook( GST_FILE, 'gst_run_cleanup' );
add_action( 'init', 'gst_run_cleanup', 20 );
