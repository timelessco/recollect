import Script from "next/script";

export const AnalyticsScript = () => {
	// Only render in production
	if (process.env.NODE_ENV !== "production") {
		return null;
	}

	// Check if environment variables are available
	if (!process.env.UMAMI_ID || !process.env.UMAMI_SRC) {
		return null;
	}

	return (
		<Script
			async
			data-website-id={process.env.UMAMI_ID}
			src={process.env.UMAMI_SRC}
			strategy="afterInteractive"
		/>
	);
};
