(function () {
	var toggle = document.querySelector('.gst-header__toggle');
	var panel = document.getElementById('gst-mobile-nav');
	if (!toggle || !panel) {
		return;
	}
	toggle.addEventListener('click', function () {
		var open = panel.hasAttribute('hidden');
		if (open) {
			panel.removeAttribute('hidden');
		} else {
			panel.setAttribute('hidden', '');
		}
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
	});
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && !panel.hasAttribute('hidden')) {
			panel.setAttribute('hidden', '');
			toggle.setAttribute('aria-expanded', 'false');
			toggle.focus();
		}
	});
})();
