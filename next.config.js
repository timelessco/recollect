import withBundleAnalyzer from "@next/bundle-analyzer";
// Injected content via Sentry wizard below

import { withSentryConfig } from "@sentry/nextjs";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// eslint-disable-next-line no-unused-expressions, @babel/no-unused-expressions
!process.env.SKIP_ENV_VALIDATION && (await import("./env/server.js"));

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	// https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
	// reactStrictMode: true,
	eslint: {
		ignoreDuringBuilds: false,
	},
	// Enable the below option only when you are debugging sourceamp
	productionBrowserSourceMaps: process.env.SOURCEMAP === "true",
	images: {
		// Disables Next.js image optimization except in production on Vercel
		unoptimized: !process.env.VERCEL_ENV === "production",
		formats: ["image/avif", "image/webp"],
		deviceSizes: [384, 640, 768, 1_024, 1_280, 1_440, 2_560],
		imageSizes: [128, 256],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
// export default bundleAnalyzer(nextConfig);

export default withSentryConfig(
	// module.exports,
	bundleAnalyzer(nextConfig),
	{
		// For all available options, see:
		// https://github.com/getsentry/sentry-webpack-plugin#options

		// Suppresses source map uploading logs during build
		silent: true,
		org: "abhishek-45",
		project: "javascript-nextjs",
	},
	{
		// For all available options, see:
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		// Transpiles SDK to be compatible with IE11 (increases bundle size)
		transpileClientSDK: true,

		// Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
		tunnelRoute: "/monitoring",

		// Hides source maps from generated client bundles
		hideSourceMaps: true,

		// Automatically tree-shake Sentry logger statements to reduce bundle size
		disableLogger: true,
	},
);
