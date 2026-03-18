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
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
	const ensureMaximumScale = () => {
		const viewportMetadata = document.querySelector('meta[name=viewport]');

		if (viewportMetadata !== null) {
			const content = viewportMetadata.getAttribute('content') || '';

			if (!content.includes('maximum-scale=1.0')) {
				viewportMetadata.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
			}
		}
	}

	ensureMaximumScale();

	const observer = new MutationObserver(() => {
		ensureMaximumScale();
	});

	const viewport = document.querySelector('meta[name=viewport]');

	if (viewport) {
		observer.observe(viewport, { attributes: true, attributeFilter: ['content'] });
	}
}
`,
			}}
		/>
	);
}
