<?php
/**
 * Front-end header and footer.
 *
 * Replicates the Elementor Pro Theme Builder header (template 6224) and footer
 * (template 6331) that were live until October 2026, using plain HTML/CSS so no
 * premium plugin is required.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GST_LOGO_DARK  = '/wp-content/uploads/2023/08/logo.png';
const GST_LOGO_WHITE = '/wp-content/uploads/2025/03/logo-white.png';

/**
 * Primary navigation items. The desktop bar shows the first six; the mobile
 * panel shows all of them, matching the old Pro header.
 */
function gst_menu_items() {
	$items = array(
		array( 'Home', '/' ),
		array( 'Produk', '/product/' ),
		array( 'Tentang Kami', '/about-us/' ),
		array( 'Join Reseller', '/join-reseller/' ),
		array( 'Edukasi', '/panduan-instalasi/' ),
		array( 'Blog', '/blog/' ),
		array( 'Hubungi Kami', '/kontak/' ),
		array( 'Klaim Garansi', '/dll/' ),
	);
	return apply_filters( 'gst_menu_items', $items );
}

function gst_should_render() {
	if ( is_admin() || wp_doing_ajax() ) {
		return false;
	}
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return false;
	}
	// Elementor editor and preview frames render their own chrome.
	if ( class_exists( '\Elementor\Plugin' ) ) {
		$elementor = \Elementor\Plugin::$instance;
		if ( ( isset( $elementor->editor ) && $elementor->editor->is_edit_mode() )
			|| ( isset( $elementor->preview ) && $elementor->preview->is_preview_mode() ) ) {
			return false;
		}
	}
	return true;
}

function gst_current_path() {
	$uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
	$path = wp_parse_url( $uri, PHP_URL_PATH );
	return $path ? trailingslashit( $path ) : '/';
}

function gst_nav_list( array $items, $class ) {
	$current = gst_current_path();
	$html    = '<ul class="' . esc_attr( $class ) . '">';
	foreach ( $items as $item ) {
		list( $label, $href ) = $item;
		$is_active = trailingslashit( $href ) === $current;
		$html     .= sprintf(
			'<li><a href="%s"%s>%s</a></li>',
			esc_url( home_url( $href ) ),
			$is_active ? ' class="is-active" aria-current="page"' : '',
			esc_html( $label )
		);
	}
	return $html . '</ul>';
}

function gst_enqueue_assets() {
	if ( ! gst_should_render() ) {
		return;
	}
	wp_enqueue_style(
		'gst-fonts',
		'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap',
		array(),
		null
	);
	wp_enqueue_style( 'gst-layout', GST_URL . 'assets/layout.css', array(), GST_VERSION );
	wp_enqueue_script( 'gst-layout', GST_URL . 'assets/layout.js', array(), GST_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'gst_enqueue_assets' );

function gst_render_header() {
	static $done = false;
	if ( $done || ! gst_should_render() ) {
		return;
	}
	$done  = true;
	$items = gst_menu_items();
	?>
	<header class="gst-header" id="gst-header">
		<div class="gst-header__inner">
			<a class="gst-header__logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
				<img src="<?php echo esc_url( home_url( GST_LOGO_DARK ) ); ?>" width="1080" height="179" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
			</a>
			<nav class="gst-header__nav" aria-label="Menu utama">
				<?php echo gst_nav_list( array_slice( $items, 0, 6 ), 'gst-menu' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</nav>
			<div class="gst-header__actions">
				<a class="gst-btn gst-btn--accent" href="<?php echo esc_url( home_url( '/dll/' ) ); ?>">Klaim Garansi</a>
				<a class="gst-btn gst-btn--dark" href="<?php echo esc_url( home_url( '/kontak' ) ); ?>">Hubungi Kami</a>
			</div>
			<button class="gst-header__toggle" type="button" aria-expanded="false" aria-controls="gst-mobile-nav" aria-label="Buka menu">
				<svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
			</button>
		</div>
		<nav class="gst-header__mobile" id="gst-mobile-nav" aria-label="Menu ponsel" hidden>
			<?php echo gst_nav_list( $items, 'gst-menu-mobile' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		</nav>
	</header>
	<?php
}
add_action( 'wp_body_open', 'gst_render_header', 5 );

function gst_social_icon( $name ) {
	$paths = array(
		'facebook' => 'M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V22h3.4z',
		'twitter'  => 'M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.6.8-2.6 1-.7-.8-1.8-1.3-3-1.3-2.3 0-4.1 1.8-4.1 4.1 0 .3 0 .6.1.9C8.5 8.8 5.5 7.2 3.5 4.7c-.4.6-.6 1.3-.6 2.1 0 1.4.7 2.7 1.8 3.4-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4-.3.1-.7.1-1.1.1-.3 0-.5 0-.8-.1.5 1.6 2 2.8 3.8 2.8-1.4 1.1-3.2 1.8-5.1 1.8-.3 0-.7 0-1-.1 1.8 1.2 4 1.8 6.3 1.8 7.5 0 11.7-6.2 11.7-11.7v-.5c.9-.5 1.6-1.2 2.1-2z',
		'youtube'  => 'M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3-5.2 3z',
	);
	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}
	return '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' . $paths[ $name ] . '"/></svg>';
}

function gst_render_footer() {
	static $done = false;
	if ( $done || ! gst_should_render() ) {
		return;
	}
	$done = true;

	$socials = apply_filters(
		'gst_social_links',
		array(
			'facebook' => array( 'Facebook', '#' ),
			'twitter'  => array( 'Twitter', '#' ),
			'youtube'  => array( 'Youtube', '#' ),
		)
	);
	$information = array(
		array( 'Beranda', '/' ),
		array( 'Produk', '/produk/' ),
		array( 'Promo', '/promo/' ),
		array( 'Hubungi Kami', '/hubungi-kami/' ),
		array( 'Blog', '/blog/' ),
	);
	$quick_links = array(
		array( 'Tentang Kami', '/about-us/' ),
		array( 'Kebijakan Privasi', '#' ),
		array( 'Syarat & Ketentuan', '#' ),
		array( 'Karir', '#' ),
	);
	?>
	<footer class="gst-footer" id="gst-footer">
		<div class="gst-footer__inner">
			<div class="gst-footer__col gst-footer__about">
				<a class="gst-footer__logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
					<img src="<?php echo esc_url( home_url( GST_LOGO_WHITE ) ); ?>" width="499" height="70" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
				</a>
				<p>Regulator gas revolusioner dengan teknologi terkini untuk keamanan, keandalan, dan kenyamanan maksimal.</p>
				<div class="gst-social">
					<?php foreach ( $socials as $key => $social ) : ?>
						<a href="<?php echo esc_url( $social[1] ); ?>" target="_blank" rel="noopener" aria-label="<?php echo esc_attr( $social[0] ); ?>">
							<?php echo gst_social_icon( $key ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						</a>
					<?php endforeach; ?>
				</div>
			</div>
			<div class="gst-footer__col">
				<h2>Information</h2>
				<div class="gst-footer__divider"></div>
				<?php echo gst_nav_list( $information, 'gst-footer__list' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</div>
			<div class="gst-footer__col">
				<h2>Quick Links</h2>
				<div class="gst-footer__divider"></div>
				<?php echo gst_nav_list( $quick_links, 'gst-footer__list' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</div>
			<div class="gst-footer__col">
				<h2>Newsletter</h2>
				<div class="gst-footer__divider"></div>
				<p>Dapatkan informasi promo terbaru langsung di email Anda.</p>
				<form class="gst-newsletter" action="<?php echo esc_url( home_url( '/kontak/' ) ); ?>" method="get">
					<input type="email" name="email" placeholder="Your Email Address" aria-label="Email" required>
					<button type="submit" aria-label="Kirim">
						<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
					</button>
				</form>
			</div>
		</div>
		<div class="gst-footer__bottom">
			<div class="gst-footer__divider"></div>
			<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Gascompsuperlock. All rights reserved.</p>
		</div>
	</footer>
	<?php
}
add_action( 'wp_footer', 'gst_render_footer', 5 );

/**
 * Twenty Twenty-Four is a block theme and prints its own header/footer template
 * parts on shop and archive pages. Suppress them so the site has one header.
 */
function gst_suppress_theme_template_parts( $content, $block ) {
	if ( ! gst_should_render() ) {
		return $content;
	}
	$area = isset( $block['attrs']['area'] ) ? $block['attrs']['area'] : '';
	$slug = isset( $block['attrs']['slug'] ) ? $block['attrs']['slug'] : '';
	if ( in_array( $area, array( 'header', 'footer' ), true ) || in_array( $slug, array( 'header', 'footer' ), true ) ) {
		return '';
	}
	return $content;
}
add_filter( 'render_block_core/template-part', 'gst_suppress_theme_template_parts', 10, 2 );
