import Script from "next/script";

// Prevents iOS Safari from auto-zooming when focusing inputs with font-size < 16px.
// Only modifies the viewport meta tag on iOS devices to preserve pinch-to-zoom on other platforms.
// Uses a MutationObserver to persist maximum-scale across Next.js client-side navigations.
// https://stackoverflow.com/a/57527009
export function IosAutozoomFix() {
	return (
		<Script
			id="ios-autozoom-fix"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
	const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';

	const observer = new MutationObserver(() => {
		const meta = document.querySelector('meta[name=viewport]');
		if (!meta) return;
		if (meta.getAttribute('content') === VIEWPORT_CONTENT) return;

		observer.disconnect();
		meta.setAttribute('content', VIEWPORT_CONTENT);
		observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
	});

	const meta = document.querySelector('meta[name=viewport]');
	if (meta) {
		meta.setAttribute('content', VIEWPORT_CONTENT);
	}

	observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
}
`,
			}}
		/>
	);
}
