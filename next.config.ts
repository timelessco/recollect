import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { type NextConfig } from "next";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// eslint-disable-next-line no-eq-null, eqeqeq
if (process.env.SKIP_ENV_VALIDATION == null) {
	(async () => {
		await import("./scripts/env/server.js");
	})();
}

const hasSentry = Boolean(
	process.env.SENTRY_ORG &&
	process.env.SENTRY_PROJECT &&
	process.env.SENTRY_AUTH_TOKEN,
);

const nextConfig: NextConfig = {
	// https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
	// reactStrictMode: true,
	typescript: {
		ignoreBuildErrors: true,
	},

	typedRoutes: true,

	logging: {
		fetches: {
			fullUrl: true,
			hmrRefreshes: true,
		},
		browserToTerminal: true,
	},

	experimental: {
		prefetchInlining: true,
		appNewScrollHandler: true,
		sri: {
			algorithm: "sha256",
		},
	},

	// Enable the below option only when you are debugging sourceamp
	productionBrowserSourceMaps: process.env.SOURCEMAP === "true",

	images: {
		loader: "custom",
		loaderFile: "./src/utils/cloudflareImageLoader.ts",
		// Disables Next.js image optimization except in production
		unoptimized: false,
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

	serverExternalPackages: ["@sentry/nextjs", "image-size"],

	async redirects() {
		return await Promise.resolve([
			{
				destination: `/everything`,
				// temporary redirect (307)
				permanent: false,
				source: "/",
			},
			{
				destination: `/everything/:path*`,
				// 301 permanent redirect
				permanent: true,
				source: "/all-bookmarks/:path*",
			},
		]);
	},
};

const noWrapper = (config: NextConfig) => config;

const withAnalyzer =
	process.env.ANALYZE === "true" ? withBundleAnalyzer() : noWrapper;

const withSentry = hasSentry
	? (config: NextConfig) =>
			withSentryConfig(config, {
				authToken: process.env.SENTRY_AUTH_TOKEN,
				org: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,

				// Upload a larger set of source maps for prettier stack traces (increases build time)
				widenClientFileUpload: true,

				// Only print logs for uploading source maps in CI
				silent: !process.env.CI,

				// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
				tunnelRoute: "/skynet",

				// Capture React Component Names
				reactComponentAnnotation: { enabled: true },

				// For all available options, see:
				// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/
			})
	: noWrapper;

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
const nextConfigWithExtensions = withSentry(withAnalyzer(nextConfig));

export default nextConfigWithExtensions;
