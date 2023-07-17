import withBundleAnalyzer from "@next/bundle-analyzer";

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
		ignoreDuringBuilds: true,
	},

	// Enable the below option only when you are debugging sourceamp
	productionBrowserSourceMaps: process.env.SOURCEMAP === "true",
	images: {
		domains: [
			"lh3.googleusercontent.com",
			"images.unsplash.com",
			"upload.wikimedia.org",
			"migvwxtngvrjsyawpuwk.supabase.co",
		],
		formats: ["image/avif", "image/webp"],
		deviceSizes: [384, 640, 768, 1_024, 1_280, 1_440, 2_560],
		imageSizes: [128, 256],
	},
};

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
export default bundleAnalyzer(nextConfig);
