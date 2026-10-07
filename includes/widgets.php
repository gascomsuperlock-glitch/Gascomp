<?php
/**
 * Replacement widgets for the Elementor Pro widget types still referenced in
 * saved page data. Each class keeps the Pro widget *name*, so Elementor passes
 * the original saved settings to it and the pages render without editing them.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function gst_register_widgets( $widgets_manager ) {
	if ( ! class_exists( '\Elementor\Widget_Base' ) ) {
		return;
	}
	if ( ! class_exists( 'GST_Shim_Widget' ) ) {
		require_once GST_PATH . 'includes/widget-classes.php';
	}
	// Never shadow a widget another plugin already provides.
	foreach ( gst_shim_widget_classes() as $name => $class ) {
		if ( null === $widgets_manager->get_widget_types( $name ) ) {
			$widgets_manager->register( new $class() );
		}
	}
}
add_action( 'elementor/widgets/register', 'gst_register_widgets', 100 );

function gst_shim_widget_classes() {
	return array(
		'wc-categories'             => 'GST_Widget_WC_Categories',
		'woocommerce-products'      => 'GST_Widget_WC_Products',
		'woocommerce-breadcrumb'    => 'GST_Widget_WC_Breadcrumb',
		'woocommerce-product-title' => 'GST_Widget_WC_Product_Title',
		'testimonial-carousel'      => 'GST_Widget_Testimonial_Carousel',
		'form'                      => 'GST_Widget_Form',
		'countdown'                 => 'GST_Widget_Countdown',
		'loop-grid'                 => 'GST_Widget_Loop_Grid',
	);
}

function gst_enqueue_widget_assets() {
	if ( is_admin() ) {
		return;
	}
	wp_enqueue_style( 'gst-widgets', GST_URL . 'assets/widgets.css', array(), GST_VERSION );
	wp_enqueue_script( 'gst-widgets', GST_URL . 'assets/widgets.js', array(), GST_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'gst_enqueue_widget_assets' );

/** Read one saved setting with a default; `$settings` is the raw element data. */
function gst_setting( array $settings, $key, $default = '' ) {
	return isset( $settings[ $key ] ) && '' !== $settings[ $key ] ? $settings[ $key ] : $default;
}

/** Find an element by id inside a post's saved Elementor data. */
function gst_find_element( $post_id, $element_id ) {
	$raw = get_post_meta( $post_id, '_elementor_data', true );
	$data = is_string( $raw ) ? json_decode( $raw, true ) : $raw;
	if ( ! is_array( $data ) ) {
		return null;
	}
	$stack = $data;
	while ( $stack ) {
		$el = array_pop( $stack );
		if ( isset( $el['id'] ) && $el['id'] === $element_id ) {
			return $el;
		}
		if ( ! empty( $el['elements'] ) ) {
			foreach ( $el['elements'] as $child ) {
				$stack[] = $child;
			}
		}
	}
	return null;
}
