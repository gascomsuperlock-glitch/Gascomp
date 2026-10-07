(function () {
	'use strict';

	/* ---------- Testimonial carousel ---------- */
	function perView(el) {
		var w = window.innerWidth;
		var key = w <= 767 ? 'perViewMobile' : w <= 1024 ? 'perViewTablet' : 'perView';
		return Math.max(1, parseInt(el.dataset[key] || el.dataset.perView || 1, 10));
	}

	function initCarousel(el) {
		var track = el.querySelector('.gst-carousel__track');
		var slides = track ? track.children : [];
		if (!track || slides.length === 0) {
			return;
		}
		var dots = el.querySelector('.gst-carousel__dots');
		var prev = el.querySelector('.gst-carousel__arrow--prev');
		var next = el.querySelector('.gst-carousel__arrow--next');
		var autoplay = parseInt(el.dataset.autoplay || 0, 10);
		var loop = el.dataset.loop === '1';
		var index = 0;
		var timer = null;

		el.style.setProperty('--gst-per-view', el.dataset.perView || 3);
		el.style.setProperty('--gst-per-view-tablet', el.dataset.perViewTablet || 2);
		el.style.setProperty('--gst-per-view-mobile', el.dataset.perViewMobile || 1);

		function pages() {
			return Math.max(1, slides.length - perView(el) + 1);
		}
		function render() {
			var max = pages() - 1;
			if (index > max) { index = loop ? 0 : max; }
			if (index < 0) { index = loop ? max : 0; }
			track.style.transform = 'translateX(' + (-index * (100 / perView(el))) + '%)';
			if (dots) {
				Array.prototype.forEach.call(dots.children, function (dot, i) {
					dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
				});
			}
		}
		function buildDots() {
			if (!dots) { return; }
			dots.innerHTML = '';
			for (var i = 0; i < pages(); i++) {
				var b = document.createElement('button');
				b.type = 'button';
				b.setAttribute('role', 'tab');
				b.setAttribute('aria-label', 'Slide ' + (i + 1));
				b.addEventListener('click', (function (n) { return function () { index = n; render(); restart(); }; })(i));
				dots.appendChild(b);
			}
		}
		function step(delta) { index += delta; render(); }
		function restart() {
			if (!autoplay) { return; }
			clearInterval(timer);
			timer = setInterval(function () { step(1); }, autoplay);
		}
		if (prev) { prev.addEventListener('click', function () { step(-1); restart(); }); }
		if (next) { next.addEventListener('click', function () { step(1); restart(); }); }
		el.addEventListener('mouseenter', function () { clearInterval(timer); });
		el.addEventListener('mouseleave', restart);
		window.addEventListener('resize', function () { buildDots(); render(); });
		buildDots();
		render();
		restart();
	}

	/* ---------- Countdown ---------- */
	function initCountdown(el) {
		var due = parseInt(el.dataset.due || 0, 10) * 1000;
		var evergreen = parseInt(el.dataset.evergreen || 0, 10) * 1000;
		if (!due && evergreen) {
			var key = el.dataset.key || 'gst-cd';
			var stored = 0;
			try { stored = parseInt(localStorage.getItem(key) || 0, 10); } catch (e) { stored = 0; }
			if (!stored || stored < Date.now()) {
				stored = Date.now() + evergreen;
				try { localStorage.setItem(key, String(stored)); } catch (e) { /* private mode */ }
			}
			due = stored;
		}
		var fields = {
			days: el.querySelector('.elementor-countdown-days'),
			hours: el.querySelector('.elementor-countdown-hours'),
			minutes: el.querySelector('.elementor-countdown-minutes'),
			seconds: el.querySelector('.elementor-countdown-seconds')
		};
		function pad(n) { return (n < 10 ? '0' : '') + n; }
		function tick() {
			var diff = Math.max(0, Math.floor((due - Date.now()) / 1000));
			var d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
			if (fields.days) { fields.days.textContent = pad(d); }
			if (fields.hours) { fields.hours.textContent = pad(h); }
			if (fields.minutes) { fields.minutes.textContent = pad(m); }
			if (fields.seconds) { fields.seconds.textContent = pad(s); }
			if (diff <= 0) { clearInterval(t); }
		}
		var t = setInterval(tick, 1000);
		tick();
	}

	function init() {
		Array.prototype.forEach.call(document.querySelectorAll('.gst-carousel'), initCarousel);
		Array.prototype.forEach.call(document.querySelectorAll('.gst-countdown'), initCountdown);
		var form = document.querySelector('.gst-form .elementor-message');
		if (form && location.hash === '#gst-form') {
			form.closest('form').scrollIntoView({ block: 'center' });
		}
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
