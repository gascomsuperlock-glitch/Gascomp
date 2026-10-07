<?php
/**
 * Submission handler for the replacement form widget.
 *
 * Every submission is stored as a private "gst_submission" post (visible in
 * wp-admin under "Form Submissions") and e-mailed to the address the form was
 * configured with, so nothing is lost if mail delivery fails.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function gst_register_submission_cpt() {
	register_post_type(
		'gst_submission',
		array(
			'labels'          => array(
				'name'          => 'Form Submissions',
				'singular_name' => 'Form Submission',
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => true,
			'menu_icon'       => 'dashicons-email-alt',
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
			'supports'        => array( 'title', 'editor' ),
		)
	);
}
add_action( 'init', 'gst_register_submission_cpt' );

function gst_handle_form_submission() {
	$post_id = isset( $_POST['gst_post'] ) ? (int) $_POST['gst_post'] : 0;
	$el_id   = isset( $_POST['gst_el'] ) ? sanitize_key( wp_unslash( $_POST['gst_el'] ) ) : '';
	$back    = isset( $_POST['gst_back'] ) ? esc_url_raw( wp_unslash( $_POST['gst_back'] ) ) : home_url( '/' );
	if ( 0 !== strpos( $back, home_url() ) ) {
		$back = home_url( '/' );
	}
	$fail = add_query_arg( 'gst_error', $el_id, $back ) . '#gst-form';
	$ok   = add_query_arg( 'gst_sent', $el_id, $back ) . '#gst-form';

	if ( ! $post_id || ! $el_id || ! isset( $_POST['gst_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['gst_nonce'] ), 'gst_form_' . $el_id ) ) {
		wp_safe_redirect( $fail );
		exit;
	}
	if ( ! empty( $_POST['gst_hp'] ) ) {
		wp_safe_redirect( $ok ); // Bots get a success page and nothing else.
		exit;
	}
	$element = gst_find_element( $post_id, $el_id );
	if ( ! $element || ( $element['widgetType'] ?? '' ) !== 'form' ) {
		wp_safe_redirect( $fail );
		exit;
	}
	$settings = $element['settings'];
	$values   = isset( $_POST['fields'] ) && is_array( $_POST['fields'] ) ? wp_unslash( $_POST['fields'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	$lines    = array();
	$reply_to = '';

	foreach ( (array) gst_setting( $settings, 'form_fields', array() ) as $f ) {
		$type = gst_setting( $f, 'field_type', 'text' );
		if ( in_array( $type, array( 'html', 'recaptcha', 'recaptcha_v3', 'honeypot', 'step' ), true ) ) {
			continue;
		}
		$id    = sanitize_key( gst_setting( $f, 'custom_id', $f['_id'] ?? '' ) );
		$label = gst_setting( $f, 'field_label', $id );
		$raw   = isset( $values[ $id ] ) ? $values[ $id ] : '';
		$value = is_array( $raw ) ? implode( ', ', array_map( 'sanitize_text_field', $raw ) ) : ( 'textarea' === $type ? sanitize_textarea_field( $raw ) : sanitize_text_field( $raw ) );
		if ( 'true' === gst_setting( $f, 'required', '' ) && '' === $value && 'upload' !== $type ) {
			wp_safe_redirect( $fail );
			exit;
		}
		if ( 'email' === $type && $value && ! is_email( $value ) ) {
			wp_safe_redirect( $fail );
			exit;
		}
		if ( 'email' === $type && $value && ! $reply_to ) {
			$reply_to = $value;
		}
		if ( 'upload' === $type ) {
			$value = gst_store_upload( $id );
		}
		$lines[] = $label . ': ' . $value;
	}

	$form_name = gst_setting( $settings, 'form_name', get_the_title( $post_id ) );
	$body      = implode( "\n", $lines ) . "\n\nHalaman: " . get_permalink( $post_id ) . "\nWaktu: " . current_time( 'mysql' ) . "\nIP: " . ( isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '-' );

	wp_insert_post(
		array(
			'post_type'    => 'gst_submission',
			'post_status'  => 'private',
			'post_title'   => $form_name . ' - ' . current_time( 'Y-m-d H:i' ),
			'post_content' => $body,
		)
	);

	$to = array_filter( array_map( 'trim', explode( ',', (string) gst_setting( $settings, 'email_to', get_option( 'admin_email' ) ) ) ) );
	$to = array_filter( $to, 'is_email' );
	if ( ! $to ) {
		$to = array( get_option( 'admin_email' ) );
	}
	$subject = gst_setting( $settings, 'email_subject', 'Pesan baru dari ' . get_bloginfo( 'name' ) );
	$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
	if ( $reply_to ) {
		$headers[] = 'Reply-To: ' . $reply_to;
	}
	wp_mail( $to, $subject, $body, $headers );

	wp_safe_redirect( $ok );
	exit;
}
add_action( 'admin_post_nopriv_gst_form', 'gst_handle_form_submission' );
add_action( 'admin_post_gst_form', 'gst_handle_form_submission' );

/** Move an uploaded file into the media library; returns its URL or a note. */
function gst_store_upload( $field_id ) {
	if ( empty( $_FILES['fields']['name'][ $field_id ] ) ) {
		return '-';
	}
	$file = array(
		'name'     => sanitize_file_name( $_FILES['fields']['name'][ $field_id ] ),
		'type'     => $_FILES['fields']['type'][ $field_id ],
		'tmp_name' => $_FILES['fields']['tmp_name'][ $field_id ],
		'error'    => $_FILES['fields']['error'][ $field_id ],
		'size'     => $_FILES['fields']['size'][ $field_id ],
	);
	$allowed = array( 'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', 'pdf' => 'application/pdf' );
	require_once ABSPATH . 'wp-admin/includes/file.php';
	$moved = wp_handle_upload( $file, array( 'test_form' => false, 'mimes' => $allowed ) );
	return isset( $moved['url'] ) ? $moved['url'] : 'Lampiran ditolak: ' . ( $moved['error'] ?? 'format tidak didukung' );
}
