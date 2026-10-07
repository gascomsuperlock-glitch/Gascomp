<?php
/**
 * Fourth one-time pass (plugin 1.0.3): remove the SEO spam left by the
 * intrusion. Posts are moved to the trash, never deleted, so anything caught by
 * mistake can be restored from wp-admin → Posts → Trash.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GST_SPAM_FLAG = 'gst_spam_cleanup_v4_done';

/** Authors created during the intrusion (superadmin #6 was already deleted). */
function gst_rogue_author_ids() {
	return array( 7, 8, 9 );
}

/** Slug tokens that mark gambling spam; matched as whole hyphen-separated words. */
function gst_spam_tokens() {
	return array(
		'casino', 'casinos', 'kazino', 'kasino', 'cazino', 'bet', 'bets', 'betting', 'mostbet', 'slot', 'slots',
		'spins', 'spin', 'poker', 'gamstop', 'igaming', 'bookmaker', 'roulette', 'blackjack', 'jackpot', 'wager',
		'gambling', 'gamble', 'aviator', 'crypto', 'bitcoin', 'sportsbook', 'bookmakers', 'parimatch', '1xbet',
		'pin-up', 'melbet', 'betway', 'baccarat', 'lottery', 'loterie', 'bonusy', 'bonos',
	);
}

function gst_is_spam_slug( $slug ) {
	$tokens = array_map( 'strtolower', explode( '-', $slug ) );
	return (bool) array_intersect( $tokens, gst_spam_tokens() );
}

/** Drop injected elements from a saved Elementor tree; returns [tree, removed]. */
function gst_strip_injected_elements( array $elements ) {
	$removed = 0;
	$clean   = array();
	foreach ( $elements as $el ) {
		$blob = wp_json_encode( isset( $el['settings'] ) ? $el['settings'] : array() );
		if ( false !== strpos( $blob, 'so-news-block' ) || false !== strpos( $blob, 'data-batch=' ) || false !== strpos( $blob, 'left:-9999px' ) ) {
			$removed++;
			continue;
		}
		if ( ! empty( $el['elements'] ) ) {
			list( $el['elements'], $sub ) = gst_strip_injected_elements( $el['elements'] );
			$removed                     += $sub;
		}
		$clean[] = $el;
	}
	return array( $clean, $removed );
}

function gst_run_spam_cleanup() {
	if ( get_option( GST_SPAM_FLAG ) ) {
		return;
	}
	if ( ! add_option( GST_SPAM_FLAG, current_time( 'mysql', true ), '', false ) ) {
		return;
	}
	global $wpdb;
	$log   = array();
	$log[] = 'Gascomp Site Tools spam cleanup ' . GST_VERSION . ' at ' . current_time( 'mysql', true ) . ' UTC';

	// 1. Hidden widgets inside Elementor page data.
	$ids = $wpdb->get_col( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_data' AND (meta_value LIKE '%so-news-block%' OR meta_value LIKE '%data-batch=%')" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	foreach ( $ids as $id ) {
		$data = json_decode( get_post_meta( $id, '_elementor_data', true ), true );
		if ( ! is_array( $data ) ) {
			continue;
		}
		list( $data, $removed ) = gst_strip_injected_elements( $data );
		if ( $removed ) {
			update_post_meta( $id, '_elementor_data', wp_slash( wp_json_encode( $data ) ) );
			$log[] = sprintf( 'removed %d injected element(s) from post #%d (%s)', $removed, $id, get_the_title( $id ) );
		}
	}

	// 2. Spam posts and pages → trash.
	$posts   = get_posts( array(
		'post_type'      => array( 'post', 'page' ),
		'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
		'posts_per_page' => -1,
		'fields'         => 'ids',
	) );
	$trashed = array();
	foreach ( $posts as $pid ) {
		$post = get_post( $pid );
		$why  = '';
		if ( in_array( (int) $post->post_author, gst_rogue_author_ids(), true ) ) {
			$why = 'author #' . $post->post_author;
		} elseif ( gst_is_spam_slug( $post->post_name ) ) {
			$why = 'slug';
		} elseif ( false !== stripos( $post->post_content, 'so-news-block' ) ) {
			$why = 'content';
		}
		if ( $why && wp_trash_post( $pid ) ) {
			$trashed[] = $post->post_name . ' [' . $why . ']';
		}
	}
	$log[] = 'trashed ' . count( $trashed ) . ' spam post(s)/page(s) out of ' . count( $posts );
	foreach ( array_slice( $trashed, 0, 40 ) as $t ) {
		$log[] = '  trashed: ' . $t;
	}
	if ( count( $trashed ) > 40 ) {
		$log[] = '  ... and ' . ( count( $trashed ) - 40 ) . ' more';
	}

	// 3. PHP files inside uploads (report only; .htaccess already blocks execution).
	$found = array();
	$dir   = wp_get_upload_dir()['basedir'];
	if ( is_dir( $dir ) ) {
		$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );
		foreach ( $it as $file ) {
			if ( preg_match( '/\.(php[0-9]?|phtml|phar)$/i', $file->getFilename() ) ) {
				$found[] = str_replace( ABSPATH, '', $file->getPathname() );
				if ( count( $found ) >= 50 ) {
					break;
				}
			}
		}
	}
	$log[] = 'PHP files in uploads: ' . ( $found ? implode( ', ', $found ) : 'none' );

	// 4. Regenerate Elementor CSS and purge caches so visitors see the clean pages.
	if ( class_exists( '\Elementor\Plugin' ) && isset( \Elementor\Plugin::$instance->files_manager ) ) {
		\Elementor\Plugin::$instance->files_manager->clear_cache();
	}
	do_action( 'litespeed_purge_all' );
	$log[] = 'Elementor CSS cache cleared, LiteSpeed purge requested';

	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', implode( "\n", $log ) . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}
add_action( 'wp_loaded', 'gst_run_spam_cleanup', 22 );
