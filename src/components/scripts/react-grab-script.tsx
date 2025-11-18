import Script from "next/script";

export const ReactGrabScript = () => {
	// Only render in development
	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		// eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
		<Script
			src="//unpkg.com/react-grab/dist/index.global.js"
			crossOrigin="anonymous"
			strategy="beforeInteractive"
			data-enabled="true"
		/>
	);
};
