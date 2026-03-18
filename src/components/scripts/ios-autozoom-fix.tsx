import Script from "next/script";

// Prevents iOS Safari from auto-zooming when focusing inputs with font-size < 16px.
// Only modifies the viewport meta tag on iOS devices to preserve pinch-to-zoom on other platforms.
// https://stackoverflow.com/a/57527009
export function IosAutozoomFix() {
	return (
		<Script
			id="ios-autozoom-fix"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{
				__html: `
const disableInputAutoZoom = () => {
	const viewportMetadata = document.querySelector('meta[name=viewport]');

	if (viewportMetadata !== null) {
		viewportMetadata.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
	}
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
	disableInputAutoZoom();
}
`,
			}}
		/>
	);
}
