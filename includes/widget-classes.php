<?php
/**
 * Widget classes. Loaded only when Elementor registers widgets.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class GST_Shim_Widget extends \Elementor\Widget_Base {

	public function get_categories() {
		return array( 'general' );
	}

	public function get_icon() {
		return 'eicon-code';
	}

	public function show_in_panel() {
		return false;
	}

	/** Raw saved settings; unregistered controls are not filtered out here. */
	protected function raw() {
		$settings = $this->get_data( 'settings' );
		return is_array( $settings ) ? $settings : array();
	}

	/** Elementor hides widgets whose render throws; log the reason instead of losing it. */
	public function render_content() {
		try {
			parent::render_content();
		} catch ( \Throwable $e ) {
			while ( ob_get_level() > 1 ) {
				ob_end_clean();
			}
			gst_debug_log( 'render failed for ' . $this->get_name() . ': ' . get_class( $e ) . ' ' . $e->getMessage() . ' @ ' . basename( $e->getFile() ) . ':' . $e->getLine() );
		}
	}

	protected function grid_classes( array $s, $default_desktop = 4, $default_tablet = 3, $default_mobile = 2 ) {
		return array(
			'elementor-grid-' . (int) gst_setting( $s, 'columns', $default_desktop ),
			'elementor-grid-tablet-' . (int) gst_setting( $s, 'columns_tablet', $default_tablet ),
			'elementor-grid-mobile-' . (int) gst_setting( $s, 'columns_mobile', $default_mobile ),
		);
	}
}

/* ---------- WooCommerce ---------- */

class GST_Widget_WC_Categories extends GST_Shim_Widget {
	public function get_name() {
		return 'wc-categories';
	}
	public function get_title() {
		return 'Product Categories';
	}
	protected function add_render_attributes() {
		parent::add_render_attributes();
		$s = $this->raw();
		$this->add_render_attribute( '_wrapper', 'class', array_merge(
			array( 'elementor-products-grid', 'elementor-wc-products', 'elementor-product-loop-item--align-center' ),
			$this->grid_classes( $s, 4, 3, 2 )
		) );
	}
	protected function render() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		$s       = $this->raw();
		$columns = (int) gst_setting( $s, 'columns', 4 );
		$rows    = (int) gst_setting( $s, 'rows', 1 );
		$atts    = array(
			'columns'    => $columns,
			'number'     => (int) gst_setting( $s, 'number', $columns * max( 1, $rows ) ),
			'hide_empty' => 'yes' === gst_setting( $s, 'hide_empty', 'yes' ) ? 1 : 0,
			'orderby'    => gst_setting( $s, 'orderby', 'name' ),
			'order'      => gst_setting( $s, 'order', 'asc' ),
		);
		// Elementor Pro keys: source (by_id|by_parent|current_subcategories), categories, parent.
		$source = gst_setting( $s, 'source', gst_setting( $s, 'query_source', '' ) );
		$ids    = gst_setting( $s, 'categories', gst_setting( $s, 'query_include_ids', array() ) );
		gst_debug_log( 'wc-categories #' . $this->get_id() . ' settings: ' . substr( wp_json_encode( $s ), 0, 600 ) );
		if ( 'by_id' === $source && is_array( $ids ) && $ids ) {
			$atts['ids']    = implode( ',', array_map( 'intval', $ids ) );
			$atts['number'] = max( $atts['number'], count( $ids ) );
		} elseif ( 'by_parent' === $source ) {
			$atts['parent'] = (int) gst_setting( $s, 'parent', 0 );
		} elseif ( 'current_subcategories' === $source && is_product_category() ) {
			$atts['parent'] = get_queried_object_id();
		}
		echo WC_Shortcodes::product_categories( $atts ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}

class GST_Widget_WC_Products extends GST_Shim_Widget {
	public function get_name() {
		return 'woocommerce-products';
	}
	public function get_title() {
		return 'Products';
	}
	protected function add_render_attributes() {
		parent::add_render_attributes();
		$this->add_render_attribute( '_wrapper', 'class', array_merge(
			array( 'elementor-products-grid', 'elementor-wc-products' ),
			$this->grid_classes( $this->raw(), 4, 3, 2 )
		) );
	}
	protected function render() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		$s       = $this->raw();
		$columns = (int) gst_setting( $s, 'columns', 4 );
		$rows    = (int) gst_setting( $s, 'rows', 4 );
		$atts    = array(
			'columns'  => $columns,
			'limit'    => $columns * max( 1, $rows ),
			'orderby'  => gst_setting( $s, 'orderby', 'date' ),
			'order'    => gst_setting( $s, 'order', 'desc' ),
			'paginate' => 'yes' === gst_setting( $s, 'paginate', '' ) ? 'true' : 'false',
		);
		switch ( gst_setting( $s, 'query_post_type', 'product' ) ) {
			case 'by_id':
				$ids = (array) gst_setting( $s, 'query_include', array() );
				if ( $ids ) {
					$atts['ids'] = implode( ',', array_map( 'intval', $ids ) );
				}
				break;
			case 'sale':
				$atts['on_sale'] = 'true';
				break;
			case 'featured':
				$atts['visibility'] = 'featured';
				break;
			case 'current_query':
				$atts['paginate'] = 'true';
				if ( is_product_category() ) {
					$atts['category'] = get_queried_object()->slug;
				}
				break;
		}
		$shortcode = new WC_Shortcode_Products( $atts, 'products' );
		echo $shortcode->get_content(); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}

class GST_Widget_WC_Breadcrumb extends GST_Shim_Widget {
	public function get_name() {
		return 'woocommerce-breadcrumb';
	}
	public function get_title() {
		return 'WooCommerce Breadcrumbs';
	}
	protected function render() {
		if ( function_exists( 'woocommerce_breadcrumb' ) ) {
			woocommerce_breadcrumb();
		}
	}
}

class GST_Widget_WC_Product_Title extends GST_Shim_Widget {
	public function get_name() {
		return 'woocommerce-product-title';
	}
	public function get_title() {
		return 'Product Title';
	}
	protected function render() {
		$tag = gst_setting( $this->raw(), 'header_size', 'h1' );
		$tag = in_array( $tag, array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div' ), true ) ? $tag : 'h1';
		printf( '<%1$s class="product_title entry-title elementor-heading-title">%2$s</%1$s>', $tag, esc_html( get_the_title() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}

/* ---------- Testimonial carousel ---------- */

class GST_Widget_Testimonial_Carousel extends GST_Shim_Widget {
	public function get_name() {
		return 'testimonial-carousel';
	}
	public function get_title() {
		return 'Testimonial Carousel';
	}
	protected function add_render_attributes() {
		parent::add_render_attributes();
		$s = $this->raw();
		$this->add_render_attribute( '_wrapper', 'class', array(
			'elementor-testimonial--layout-' . sanitize_html_class( gst_setting( $s, 'layout', 'image_inline' ) ),
			'elementor-testimonial--skin-' . sanitize_html_class( gst_setting( $s, 'skin', 'default' ) ),
			'elementor-testimonial--align-' . sanitize_html_class( gst_setting( $s, 'alignment', 'center' ) ),
			'yes' === gst_setting( $s, 'show_arrows', 'yes' ) ? 'elementor-arrows-yes' : 'elementor-arrows-no',
			'elementor-pagination-type-' . sanitize_html_class( gst_setting( $s, 'pagination', 'bullets' ) ),
		) );
	}
	protected function render() {
		$s      = $this->raw();
		$slides = (array) gst_setting( $s, 'slides', array() );
		if ( ! $slides ) {
			return;
		}
		$attrs = sprintf(
			' data-per-view="%d" data-per-view-tablet="%d" data-per-view-mobile="%d" data-autoplay="%d" data-loop="%d" data-speed="%d"',
			(int) gst_setting( $s, 'slides_per_view', 3 ),
			(int) gst_setting( $s, 'slides_per_view_tablet', 2 ),
			(int) gst_setting( $s, 'slides_per_view_mobile', 1 ),
			'yes' === gst_setting( $s, 'autoplay', 'yes' ) ? (int) gst_setting( $s, 'autoplay_speed', 5000 ) : 0,
			'yes' === gst_setting( $s, 'loop', 'yes' ) ? 1 : 0,
			(int) gst_setting( $s, 'speed', 500 )
		);
		echo '<div class="gst-carousel elementor-swiper"' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput
		echo '<div class="gst-carousel__viewport"><div class="gst-carousel__track swiper-wrapper">';
		foreach ( $slides as $slide ) {
			$image = isset( $slide['image']['url'] ) ? $slide['image']['url'] : '';
			echo '<div class="gst-carousel__slide swiper-slide"><div class="elementor-testimonial">';
			if ( $image ) {
				echo '<div class="elementor-testimonial__image"><img src="' . esc_url( $image ) . '" alt="' . esc_attr( gst_setting( $slide, 'name', '' ) ) . '" loading="lazy"></div>';
			}
			echo '<div class="elementor-testimonial__content"><div class="elementor-testimonial__text">' . wp_kses_post( gst_setting( $slide, 'content', '' ) ) . '</div></div>';
			echo '<cite class="elementor-testimonial__cite"><span class="elementor-testimonial__name">' . esc_html( gst_setting( $slide, 'name', '' ) ) . '</span><span class="elementor-testimonial__title">' . esc_html( gst_setting( $slide, 'title', '' ) ) . '</span></cite>';
			echo '</div></div>';
		}
		echo '</div></div>';
		if ( 'yes' === gst_setting( $s, 'show_arrows', 'yes' ) ) {
			echo '<button type="button" class="gst-carousel__arrow gst-carousel__arrow--prev" aria-label="Sebelumnya">&#10094;</button><button type="button" class="gst-carousel__arrow gst-carousel__arrow--next" aria-label="Berikutnya">&#10095;</button>';
		}
		if ( 'none' !== gst_setting( $s, 'pagination', 'bullets' ) ) {
			echo '<div class="gst-carousel__dots" role="tablist"></div>';
		}
		echo '</div>';
	}
}

/* ---------- Form ---------- */

class GST_Widget_Form extends GST_Shim_Widget {
	public function get_name() {
		return 'form';
	}
	public function get_title() {
		return 'Form';
	}
	protected function render() {
		$s      = $this->raw();
		$fields = (array) gst_setting( $s, 'form_fields', array() );
		if ( ! $fields ) {
			return;
		}
		$post_id     = get_the_ID();
		$show_labels = 'yes' === gst_setting( $s, 'show_labels', 'yes' );
		$sent        = isset( $_GET['gst_sent'] ) && sanitize_key( wp_unslash( $_GET['gst_sent'] ) ) === $this->get_id(); // phpcs:ignore WordPress.Security.NonceVerification
		$failed      = isset( $_GET['gst_error'] ) && sanitize_key( wp_unslash( $_GET['gst_error'] ) ) === $this->get_id(); // phpcs:ignore WordPress.Security.NonceVerification

		echo '<form id="gst-form" class="elementor-form gst-form" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" enctype="multipart/form-data">';
		echo '<input type="hidden" name="action" value="gst_form"><input type="hidden" name="gst_post" value="' . (int) $post_id . '"><input type="hidden" name="gst_el" value="' . esc_attr( $this->get_id() ) . '">';
		echo '<input type="hidden" name="gst_back" value="' . esc_url( home_url( remove_query_arg( array( 'gst_sent', 'gst_error' ) ) ) ) . '">';
		wp_nonce_field( 'gst_form_' . $this->get_id(), 'gst_nonce' );
		echo '<input type="text" name="gst_hp" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">';
		echo '<div class="elementor-form-fields-wrapper">';
		foreach ( $fields as $f ) {
			$type = gst_setting( $f, 'field_type', 'text' );
			if ( in_array( $type, array( 'recaptcha', 'recaptcha_v3', 'honeypot', 'step' ), true ) ) {
				continue;
			}
			$id       = sanitize_key( gst_setting( $f, 'custom_id', $f['_id'] ?? uniqid() ) );
			$name     = 'fields[' . $id . ']';
			$label    = gst_setting( $f, 'field_label', '' );
			$required = 'true' === gst_setting( $f, 'required', '' ) ? ' required' : '';
			$ph       = esc_attr( gst_setting( $f, 'placeholder', '' ) );
			$width    = (int) gst_setting( $f, 'width', 100 );
			echo '<div class="elementor-field-group elementor-column elementor-col-' . $width . ' elementor-field-type-' . esc_attr( $type ) . '">';
			if ( $show_labels && $label && ! in_array( $type, array( 'html', 'hidden', 'acceptance' ), true ) ) {
				echo '<label class="elementor-field-label" for="gst-' . esc_attr( $id ) . '">' . esc_html( $label ) . ( $required ? ' <span class="gst-required">*</span>' : '' ) . '</label>';
			}
			switch ( $type ) {
				case 'textarea':
					echo '<textarea class="elementor-field elementor-field-textual" id="gst-' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" rows="' . (int) gst_setting( $f, 'rows', 4 ) . '" placeholder="' . $ph . '"' . $required . '></textarea>';
					break;
				case 'select':
					echo '<select class="elementor-field elementor-field-textual" id="gst-' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $required . '>';
					if ( $ph ) {
						echo '<option value="">' . $ph . '</option>';
					}
					foreach ( $this->options( $f ) as $opt ) {
						echo '<option value="' . esc_attr( $opt[1] ) . '">' . esc_html( $opt[0] ) . '</option>';
					}
					echo '</select>';
					break;
				case 'radio':
				case 'checkbox':
					echo '<div class="elementor-field-subgroup">';
					foreach ( $this->options( $f ) as $i => $opt ) {
						$oid = 'gst-' . $id . '-' . $i;
						echo '<span class="elementor-field-option"><input type="' . esc_attr( $type ) . '" id="' . esc_attr( $oid ) . '" name="' . esc_attr( $name ) . ( 'checkbox' === $type ? '[]' : '' ) . '" value="' . esc_attr( $opt[1] ) . '"' . ( 'radio' === $type ? $required : '' ) . '> <label for="' . esc_attr( $oid ) . '">' . esc_html( $opt[0] ) . '</label></span>';
					}
					echo '</div>';
					break;
				case 'acceptance':
					echo '<span class="elementor-field-option"><input type="checkbox" id="gst-' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="on"' . $required . '> <label for="gst-' . esc_attr( $id ) . '">' . wp_kses_post( gst_setting( $f, 'acceptance_text', $label ) ) . '</label></span>';
					break;
				case 'html':
					echo '<div class="elementor-field-html">' . wp_kses_post( gst_setting( $f, 'field_html', '' ) ) . '</div>';
					break;
				case 'hidden':
					echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( gst_setting( $f, 'field_value', '' ) ) . '">';
					break;
				case 'upload':
					echo '<input type="file" class="elementor-field" id="gst-' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" accept="image/*,.pdf"' . $required . '>';
					break;
				default:
					$html_type = in_array( $type, array( 'email', 'tel', 'number', 'url', 'date', 'time', 'password' ), true ) ? $type : 'text';
					echo '<input type="' . esc_attr( $html_type ) . '" class="elementor-field elementor-field-textual" id="gst-' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" placeholder="' . $ph . '"' . $required . '>';
			}
			echo '</div>';
		}
		echo '<div class="elementor-field-group elementor-column elementor-field-type-submit elementor-col-' . (int) gst_setting( $s, 'button_width', 100 ) . '">';
		echo '<button type="submit" class="elementor-button elementor-size-' . esc_attr( gst_setting( $s, 'button_size', 'sm' ) ) . '"><span class="elementor-button-text">' . esc_html( gst_setting( $s, 'button_text', 'Kirim' ) ) . '</span></button>';
		echo '</div></div>';
		if ( $sent ) {
			echo '<div class="elementor-message elementor-message-success" role="status">' . esc_html( gst_setting( $s, 'success_message', 'Pesan Anda sudah terkirim. Terima kasih.' ) ) . '</div>';
		} elseif ( $failed ) {
			echo '<div class="elementor-message elementor-message-danger" role="alert">' . esc_html( gst_setting( $s, 'error_message', 'Pesan belum terkirim. Periksa isian Anda dan coba lagi.' ) ) . '</div>';
		}
		echo '</form>';
	}

	/** "Label|value" lines from the saved field options. */
	private function options( array $f ) {
		$out = array();
		foreach ( preg_split( '/\r\n|\r|\n/', (string) gst_setting( $f, 'field_options', '' ) ) as $line ) {
			$line = trim( $line );
			if ( '' === $line ) {
				continue;
			}
			$parts = array_map( 'trim', explode( '|', $line, 2 ) );
			$out[] = array( $parts[0], isset( $parts[1] ) ? $parts[1] : $parts[0] );
		}
		return $out;
	}
}

/* ---------- Countdown ---------- */

class GST_Widget_Countdown extends GST_Shim_Widget {
	public function get_name() {
		return 'countdown';
	}
	public function get_title() {
		return 'Countdown';
	}
	protected function render() {
		$s = $this->raw();
		gst_debug_log( 'countdown #' . $this->get_id() . ' settings: ' . substr( wp_json_encode( $s ), 0, 600 ) );
		$timestamp = 0;
		$evergreen = 0;
		if ( 'evergreen' === gst_setting( $s, 'countdown_type', 'due_date' ) ) {
			// Per-visitor timer: the browser stores its own deadline.
			$evergreen = (int) gst_setting( $s, 'evergreen_counter_hours', 0 ) * 3600 + (int) gst_setting( $s, 'evergreen_counter_minutes', 0 ) * 60;
		} else {
			$due = gst_setting( $s, 'due_date', '' );
			if ( $due ) {
				$timestamp = strtotime( $due . ' ' . wp_timezone_string() );
				if ( ! $timestamp ) {
					$timestamp = strtotime( $due );
				}
			}
		}
		if ( ! $timestamp && ! $evergreen ) {
			return;
		}
		$parts = array(
			'days'    => array( 'show_days', 'label_days', 'Days' ),
			'hours'   => array( 'show_hours', 'label_hours', 'Hours' ),
			'minutes' => array( 'show_minutes', 'label_minutes', 'Minutes' ),
			'seconds' => array( 'show_seconds', 'label_seconds', 'Seconds' ),
		);
		echo '<div class="elementor-countdown-wrapper gst-countdown" data-due="' . (int) $timestamp . '" data-evergreen="' . (int) $evergreen . '" data-key="gst-cd-' . esc_attr( $this->get_id() ) . '">';
		foreach ( $parts as $key => $meta ) {
			if ( 'yes' !== gst_setting( $s, $meta[0], 'yes' ) ) {
				continue;
			}
			echo '<div class="elementor-countdown-item"><span class="elementor-countdown-digits elementor-countdown-' . esc_attr( $key ) . '">0</span><span class="elementor-countdown-label">' . esc_html( gst_setting( $s, $meta[1], $meta[2] ) ) . '</span></div>';
		}
		echo '</div>';
	}
}

/* ---------- Loop grid ---------- */

class GST_Widget_Loop_Grid extends GST_Shim_Widget {
	public function get_name() {
		return 'loop-grid';
	}
	public function get_title() {
		return 'Loop Grid';
	}
	protected function add_render_attributes() {
		parent::add_render_attributes();
		$this->add_render_attribute( '_wrapper', 'class', array_merge( array( 'elementor-posts-container' ), $this->grid_classes( $this->raw(), 3, 2, 1 ) ) );
	}
	protected function render() {
		$s     = $this->raw();
		$type  = gst_setting( $s, 'post_query_post_type', gst_setting( $s, 'query_post_type', 'post' ) );
		$type  = post_type_exists( $type ) ? $type : 'post';
		$args  = array(
			'post_type'           => $type,
			'posts_per_page'      => (int) gst_setting( $s, 'posts_per_page', 6 ),
			'orderby'             => gst_setting( $s, 'post_query_orderby', 'date' ),
			'order'               => gst_setting( $s, 'post_query_order', 'desc' ),
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
		);
		$ids = (array) gst_setting( $s, 'post_query_posts_ids', array() );
		if ( $ids ) {
			$args['post__in'] = array_map( 'intval', $ids );
			$args['orderby']  = 'post__in';
		}
		$terms = (array) gst_setting( $s, 'post_query_include_term_ids', array() );
		if ( $terms ) {
			$args['tax_query'] = array( array( 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => array_map( 'intval', $terms ) ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
		}
		$query = new WP_Query( $args );
		if ( ! $query->have_posts() ) {
			return;
		}
		echo '<div class="gst-loop-grid elementor-grid">';
		while ( $query->have_posts() ) {
			$query->the_post();
			echo '<article class="gst-loop-item elementor-post">';
			if ( has_post_thumbnail() ) {
				echo '<a class="gst-loop-item__thumb" href="' . esc_url( get_permalink() ) . '">' . get_the_post_thumbnail( null, 'medium_large' ) . '</a>';
			}
			echo '<div class="gst-loop-item__body"><h3 class="gst-loop-item__title"><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h3>';
			echo '<time class="gst-loop-item__date" datetime="' . esc_attr( get_the_date( 'c' ) ) . '">' . esc_html( get_the_date() ) . '</time>';
			echo '<p class="gst-loop-item__excerpt">' . esc_html( wp_trim_words( get_the_excerpt(), 20 ) ) . '</p></div></article>';
		}
		echo '</div>';
		wp_reset_postdata();
	}
}
