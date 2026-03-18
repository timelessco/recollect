import Script from "next/script";

// Prevents iOS Safari from auto-zooming when focusing inputs with font-size < 16px.
// Only modifies the viewport meta tag on iOS devices to preserve pinch-to-zoom on other platforms.
// Observes <head> for changes to persist maximum-scale across Next.js client-side navigations.
// https://stackoverflow.com/a/57527009
export function IosAutozoomFix() {
	return (
		<Script
			id="ios-autozoom-fix"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
	let applying = false;

	const applyMaximumScale = () => {
		const meta = document.querySelector('meta[name=viewport]');
		if (!meta) return;

		const content = meta.getAttribute('content') || '';
		if (content.includes('maximum-scale=1.0')) return;

		applying = true;
		meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
		applying = false;
	};

	applyMaximumScale();

	new MutationObserver(() => {
		if (!applying) applyMaximumScale();
	}).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content'] });
}
`,
			}}
		/>
	);
}
