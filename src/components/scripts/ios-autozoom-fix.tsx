import Script from "next/script";

// Prevents iOS Safari from auto-zooming when focusing inputs with font-size < 16px.
// Only modifies the viewport meta tag on iOS devices to preserve pinch-to-zoom on other platforms.
// Uses a MutationObserver to persist maximum-scale across Next.js client-side navigations.
// https://stackoverflow.com/a/57527009
export function IosAutozoomFix() {
  return (
    /* oxlint-disable react-dom/no-dangerously-set-innerhtml -- intentional static inline script */
    <Script
      dangerouslySetInnerHTML={{
        __html: `
if (!window.__iosAutozoomFixApplied) {
	var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

	if (isIOS) {
		window.__iosAutozoomFixApplied = true;
		var applying = false;

		var applyMaxScale = function() {
			var meta = document.querySelector('meta[name=viewport]');
			if (!meta) return;

			var content = meta.getAttribute('content') || '';
			if (content.includes('maximum-scale=1.0')) return;

			applying = true;
			if (/maximum-scale=[\\d.]+/.test(content)) {
				meta.setAttribute('content', content.replace(/maximum-scale=[\\d.]+/, 'maximum-scale=1.0'));
			} else {
				meta.setAttribute('content', content + ', maximum-scale=1.0');
			}
			applying = false;
		};

		applyMaxScale();

		new MutationObserver(function(mutations) {
			if (applying) return;
			for (var i = 0; i < mutations.length; i++) {
				var m = mutations[i];
				if (m.type === 'attributes' && m.target.nodeName === 'META') {
					applyMaxScale();
					return;
				}
				if (m.type === 'childList') {
					applyMaxScale();
					return;
				}
			}
		}).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
	}
}
`,
      }}
      id="ios-autozoom-fix"
      strategy="afterInteractive"
    />
  );
}
