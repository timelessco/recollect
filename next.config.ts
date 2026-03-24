import "./src/env/index.ts";
// process.env used intentionally below — build-time config vars (SENTRY_*, SOURCEMAP, ANALYZE, CI) not in env schema

import type { NextConfig } from "next";

import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const hasSentry = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN,
);

const nextConfig: NextConfig = {
  experimental: {
    appNewScrollHandler: true,
    prefetchInlining: true,
    sri: {
      algorithm: "sha256",
    },
  },

  images: {
    deviceSizes: [384, 640, 768, 1024, 1280, 1440, 2560],
    formats: ["image/avif", "image/webp"],
    imageSizes: [128, 256],
    loader: "custom",
    loaderFile: "./src/utils/cloudflareImageLoader.ts",
    remotePatterns: [
      {
        hostname: "**",
        protocol: "https",
      },
    ],
    // Disables Next.js image optimization except in production
    unoptimized: false,
  },

  logging: {
    browserToTerminal: true,
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },

  // Enable the below option only when you are debugging sourceamp
  productionBrowserSourceMaps: process.env.SOURCEMAP === "true",

  // oxlint-disable-next-line require-await -- Next.js types redirects() as async
  async redirects() {
    return [
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
    ];
  },

  serverExternalPackages: ["@sentry/nextjs", "image-size"],

  typedRoutes: true,

  // https://nextjs.org/docs/api-reference/next.config.js/react-strict-mode
  // reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};

const noWrapper = (config: NextConfig) => config;

const withAnalyzer = process.env.ANALYZE === "true" ? withBundleAnalyzer() : noWrapper;

const withSentry = hasSentry
  ? (config: NextConfig) =>
      withSentryConfig(config, {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,

        // Capture React Component Names
        reactComponentAnnotation: { enabled: true },

        // Only print logs for uploading source maps in CI
        silent: !process.env.CI,

        // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
        tunnelRoute: "/skynet",

        // Upload a larger set of source maps for prettier stack traces (increases build time)
        widenClientFileUpload: true,

        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/
      })
  : noWrapper;

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
const nextConfigWithExtensions = withSentry(withAnalyzer(nextConfig));

export default nextConfigWithExtensions;
