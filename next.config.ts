import { type NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// eslint-disable-next-line no-eq-null, eqeqeq
if (process.env.SKIP_ENV_VALIDATION == null) {
	void (async () => {
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

	// Turn on fetch and it's data cache logging when debugging rsc fetches
	experimental: {
		turbopackFileSystemCacheForDev: true,
	},

	logging: {
		fetches: {
			fullUrl: true,
			hmrRefreshes: true,
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

	serverExternalPackages: ["@sentry/nextjs"],

	// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/tree-shaking/#tree-shaking-with-nextjs
	// Only include webpack config when Sentry is enabled
	...(hasSentry && {
		webpack: (config, { webpack }) => {
			config.plugins.push(
				new webpack.DefinePlugin({
					__RRWEB_EXCLUDE_IFRAME__: true,
					__RRWEB_EXCLUDE_SHADOW_DOM__: true,
					__SENTRY_DEBUG__: false,
					__SENTRY_EXCLUDE_REPLAY_WORKER__: true,
					__SENTRY_TRACING__: false,
				}),
			);

			// return the modified config
			return config as unknown as NextConfig;
		},
	}),
};

const noWrapper = (config: NextConfig) => config;

const withAnalyzer =
	process.env.ANALYZE === "true" ? withBundleAnalyzer() : noWrapper;

const withSentry = hasSentry
	? (config: NextConfig) =>
			withSentryConfig(config, {
				authToken: process.env.SENTRY_AUTH_TOKEN,
				// org: process.env.SENTRY_ORG,
				// project: process.env.SENTRY_PROJECT,
				org: "abhishek-45",
				project: "javascript-nextjs",

				// authToken is required for this to work
				// Upload a larger set of source maps for prettier stack traces (increases build time)
				widenClientFileUpload: true,

				// Only print logs for uploading source maps in CI
				silent: !process.env.CI,

				// Automatically tree-shake Sentry logger statements to reduce bundle size
				disableLogger: true,

				// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
				// See the following for more information:
				// https://docs.sentry.io/product/crons/
				// https://vercel.com/docs/cron-jobs
				// automaticVercelMonitors: true,

				// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
				// This can increase your server load as well as your hosting bill.
				// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-side errors will fail.
				tunnelRoute: "/skynet",

				// Capture React Component Names (Optional)
				reactComponentAnnotation: { enabled: true },

				// For all available options, see:
				// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/
			})
	: noWrapper;

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
const nextConfigWithExtensions = withSentry(withAnalyzer(nextConfig));

export default nextConfigWithExtensions;
