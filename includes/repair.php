<?php
/**
 * Fifth one-time pass (plugin 1.0.4): undo collateral damage from the spam
 * cleanup. Elementor mirrors rendered page HTML into post_content, so legitimate
 * pages whose mirror still contained the injected spam block were trashed by the
 * "content" rule. Restore them to their previous status and scrub the mirror.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GST_REPAIR_FLAG = 'gst_repair_v5_done';

function gst_run_repair_v5() {
	if ( get_option( GST_REPAIR_FLAG ) ) {
		return;
	}
	if ( ! add_option( GST_REPAIR_FLAG, current_time( 'mysql', true ), '', false ) ) {
		return;
	}

	$log   = array();
	$log[] = 'Gascomp Site Tools repair ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';

	$cleanup_at = get_option( GST_SPAM_FLAG );
	$since      = $cleanup_at ? strtotime( $cleanup_at . ' UTC' ) - 60 : 0;

	// Restore the status the post had before it was trashed, not "draft".
	add_filter( 'wp_untrash_post_status', function ( $new_status, $post_id, $previous_status ) {
		return $previous_status ? $previous_status : $new_status;
	}, 10, 3 );

	$trashed  = get_posts( array(
		'post_type'      => array( 'post', 'page' ),
		'post_status'    => 'trash',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	) );
	$restored = 0;
	foreach ( $trashed as $pid ) {
		$post       = get_post( $pid );
		$trash_time = (int) get_post_meta( $pid, '_wp_trash_meta_time', true );
		if ( $trash_time < $since ) {
			continue; // Trashed before the cleanup, by someone else.
		}
		if ( in_array( (int) $post->post_author, gst_rogue_author_ids(), true ) || gst_is_spam_slug( $post->post_name ) ) {
			continue; // Genuine spam stays in the trash.
		}
		if ( wp_untrash_post( $pid ) ) {
			$restored++;
			$content = preg_replace( '#<div class="so-news-block".*?</ul>\s*</div>#s', '', $post->post_content );
			if ( null !== $content && $content !== $post->post_content ) {
				wp_update_post( array( 'ID' => $pid, 'post_content' => $content ) );
			}
			$log[] = sprintf( 'restored %s #%d (%s) to %s', $post->post_type, $pid, $post->post_name, get_post_status( $pid ) );
		}
	}
	$log[] = 'restored ' . $restored . ' post(s)/page(s) trashed by the content rule';

	// Sanity: the front page must be published.
	$front = (int) get_option( 'page_on_front' );
	if ( $front ) {
		$log[] = 'front page #' . $front . ' status: ' . get_post_status( $front );
	}

	// Elementor's element cache still holds the empty HTML rendered while Pro was off.
	global $wpdb;
	$cached = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_element_cache'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	delete_post_meta_by_key( '_elementor_element_cache' );
	$log[] = 'deleted ' . $cached . ' Elementor element cache entries';
	if ( class_exists( '\Elementor\Plugin' ) ) {
		$experiments = \Elementor\Plugin::$instance->experiments;
		$log[]       = 'Elementor experiments: e_element_cache=' . ( $experiments->is_feature_active( 'e_element_cache' ) ? 'on' : 'off' ) . ', e_optimized_markup=' . ( $experiments->is_feature_active( 'e_optimized_markup' ) ? 'on' : 'off' );
		if ( isset( \Elementor\Plugin::$instance->files_manager ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}
	}
	do_action( 'litespeed_purge_all' );

	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
add_action( 'wp_loaded', 'gst_run_repair_v5', 23 );

/**
 * Sixth pass (1.0.5): trashing the front page made WordPress reset
 * "show_on_front" to the blog index. Point the site back at the Home page.
 */
function gst_run_repair_v6() {
	if ( get_option( 'gst_repair_v6_done' ) ) {
		return;
	}
	if ( ! add_option( 'gst_repair_v6_done', current_time( 'mysql', true ), '', false ) ) {
		return;
	}
	$log   = array();
	$log[] = 'Gascomp Site Tools repair ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';
	$log[] = 'before: show_on_front=' . get_option( 'show_on_front' ) . ' page_on_front=' . get_option( 'page_on_front' ) . ' page_for_posts=' . get_option( 'page_for_posts' );

	$home = get_post( 6917 );
	if ( ! $home || 'page' !== $home->post_type || 'publish' !== $home->post_status ) {
		$home = get_page_by_path( 'home' );
	}
	if ( $home && 'publish' === $home->post_status ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $home->ID );
		$blog = get_page_by_path( 'blog' );
		if ( $blog && 'publish' === $blog->post_status && ! get_option( 'page_for_posts' ) ) {
			update_option( 'page_for_posts', $blog->ID );
		}
		$log[] = 'front page set to #' . $home->ID . ' (' . $home->post_name . ')';
	} else {
		$log[] = 'FAILED: no published Home page found';
	}
	$log[] = 'after: show_on_front=' . get_option( 'show_on_front' ) . ' page_on_front=' . get_option( 'page_on_front' ) . ' page_for_posts=' . get_option( 'page_for_posts' );
	do_action( 'litespeed_purge_all' );
	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
add_action( 'wp_loaded', 'gst_run_repair_v6', 24 );
