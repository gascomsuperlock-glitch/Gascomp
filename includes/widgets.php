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
	$report = array();
	try {
		if ( ! class_exists( 'GST_Shim_Widget' ) ) {
			require_once GST_PATH . 'includes/widget-classes.php';
		}
		// Never shadow a widget another plugin already provides.
		foreach ( gst_shim_widget_classes() as $name => $class ) {
			if ( null === $widgets_manager->get_widget_types( $name ) ) {
				$widgets_manager->register( new $class() );
				$report[] = $name . ':registered';
			} else {
				$report[] = $name . ':exists';
			}
		}
	} catch ( \Throwable $e ) {
		$report[] = 'EXCEPTION ' . get_class( $e ) . ': ' . $e->getMessage() . ' @ ' . basename( $e->getFile() ) . ':' . $e->getLine();
	}
	gst_debug_log( 'widgets/register: ' . implode( ', ', $report ) );
}
add_action( 'elementor/widgets/register', 'gst_register_widgets', 100 );

/** Append one diagnostic line, at most once per hour per message, to the plugin log. */
function gst_debug_log( $message ) {
	$key = 'gst_dbg_' . md5( $message );
	if ( get_transient( $key ) ) {
		return;
	}
	set_transient( $key, 1, HOUR_IN_SECONDS );
	file_put_contents( WP_CONTENT_DIR . '/gascomp-site-tools.log', '[' . current_time( 'mysql', true ) . '] ' . $message . "\n", FILE_APPEND | LOCK_EX ); // phpcs:ignore WordPress.WP.AlternativeFunctions
}

/** Report widgets Elementor failed to render (it swallows widget exceptions). */
add_action( 'elementor/frontend/widget/before_render', function ( $widget ) {
	static $seen = array();
	$name = $widget->get_name();
	if ( isset( gst_shim_widget_classes()[ $name ] ) && ! isset( $seen[ $name ] ) ) {
		$seen[ $name ] = true;
		gst_debug_log( 'rendering shim widget ' . $name . ' (' . get_class( $widget ) . ') on post #' . get_the_ID() );
	}
} );

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

/**
 * Fallback that does not depend on widget registration: just before Elementor
 * renders a document, swap every still-unknown Pro widget for Elementor's own
 * Shortcode widget, whose shortcode re-renders the element with our class.
 */
function gst_rewrite_unknown_widgets( $data, $post_id ) {
	if ( ! is_array( $data ) || ! class_exists( '\Elementor\Plugin' ) ) {
		return $data;
	}
	$manager = \Elementor\Plugin::$instance->widgets_manager;
	$classes = gst_shim_widget_classes();
	$walk    = function ( array $elements ) use ( &$walk, $manager, $classes, $post_id ) {
		foreach ( $elements as &$el ) {
			$type = isset( $el['widgetType'] ) ? $el['widgetType'] : '';
			if ( $type && isset( $classes[ $type ] ) && null === $manager->get_widget_types( $type ) ) {
				$el['widgetType'] = 'shortcode';
				$el['settings']   = array( 'shortcode' => sprintf( '[gst_widget t="%s" p="%d" i="%s"]', $type, $post_id, $el['id'] ) );
				gst_debug_log( 'fallback: rewrote ' . $type . ' #' . $el['id'] . ' on post #' . $post_id . ' to shortcode' );
			}
			if ( ! empty( $el['elements'] ) ) {
				$el['elements'] = $walk( $el['elements'] );
			}
		}
		return $elements;
	};
	return $walk( $data );
}
add_filter( 'elementor/frontend/builder_content_data', 'gst_rewrite_unknown_widgets', 10, 2 );

function gst_widget_shortcode( $atts ) {
	$atts    = shortcode_atts( array( 't' => '', 'p' => 0, 'i' => '' ), $atts );
	$classes = gst_shim_widget_classes();
	if ( ! isset( $classes[ $atts['t'] ] ) || ! class_exists( '\Elementor\Widget_Base' ) ) {
		return '';
	}
	$element = gst_find_element( (int) $atts['p'], sanitize_key( $atts['i'] ) );
	if ( ! $element ) {
		return '';
	}
	if ( ! class_exists( 'GST_Shim_Widget' ) ) {
		require_once GST_PATH . 'includes/widget-classes.php';
	}
	try {
		$widget = new $classes[ $atts['t'] ]( $element, array() );
		ob_start();
		$widget->print_element();
		return ob_get_clean();
	} catch ( \Throwable $e ) {
		if ( ob_get_level() ) {
			ob_end_clean();
		}
		gst_debug_log( 'shortcode render failed for ' . $atts['t'] . ': ' . $e->getMessage() . ' @ ' . basename( $e->getFile() ) . ':' . $e->getLine() );
		return '';
	}
}
add_shortcode( 'gst_widget', 'gst_widget_shortcode' );

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
