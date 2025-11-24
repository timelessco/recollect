// Thanks to https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#basic-fields

// import * as Sentry from "@sentry/nextjs";

import { type Metadata, type Viewport } from "next";

import {
	BASE_URL,
	SERVICES_OFFERED,
	SITE_AUTHOR,
	SITE_DESCRIPTION,
	SITE_NAME,
	SITE_SOCIAL_MEDIA_IDS,
} from "@/site-config";

// import { splashScreens } from "./splash-screens";

export const rootViewport = {
	colorScheme: "dark light",
	themeColor: [
		{ color: "#000000", media: "(prefers-color-scheme: dark)" },
		{ color: "#FFF", media: "(prefers-color-scheme: light)" },
	],
} satisfies Viewport;

export const sharedMetadata = {
	appleWebApp: {
		capable: true,
		// startupImage: splashScreens,
		statusBarStyle: "default",
		title: SITE_NAME,
	},
	applicationName: SITE_NAME,
	authors: [{ name: SITE_AUTHOR, url: BASE_URL }],
	category: "technology",
	creator: SITE_AUTHOR,
	formatDetection: {
		address: false,
		email: false,
		telephone: false,
	},
	generator: "Next.js",
	keywords: SERVICES_OFFERED.map((service) => service.toLowerCase()),
	// manifest: `/manifest.webmanifest`,
	// https://github.com/vercel/next.js/issues/74524
	// https://stackoverflow.com/a/79380945/10858781
	// This is a workaround to enable PWA splash screen on iOS
	other: {
		"apple-mobile-web-app-capable": "yes",
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
		// ...Sentry.getTraceData(),
	},
	publisher: "Vercel",
	referrer: "origin-when-cross-origin",
	robots:
		process.env.VERCEL_ENV === "production"
			? {
					follow: true,
					googleBot: {
						follow: true,
						index: true,
						"max-image-preview": "large",
						"max-snippet": -1,
						"max-video-preview": -1,
						noimageindex: false,
					},
					index: true,
					nocache: false,
				}
			: {
					follow: false,
					index: false,
				},
} satisfies Partial<Metadata>;

type GeneratePageMetadataProps = {
	description: string;
	imageHeight: number;
	imageUrl: string;
	imageWidth: number;
	title: string;
	url: string;
};

export function generatePageMetadata(
	props: Partial<GeneratePageMetadataProps>,
): Metadata {
	const {
		description = SITE_DESCRIPTION,
		imageHeight = 1260,
		imageUrl = "/opengraph-image.jpg",
		imageWidth = 2400,
		title = "Home",
		url: pageUrl = BASE_URL,
	} = props;
	const pageTitle = `${title} | ${SITE_NAME}`;

	return {
		...sharedMetadata,
		alternates: {
			canonical: pageUrl,
		},
		appLinks: {
			web: {
				should_fallback: true,
				url: BASE_URL,
			},
		},
		description,
		metadataBase: new URL(BASE_URL),
		openGraph: {
			description,
			images: [
				{
					alt: title,
					height: imageHeight,
					url: imageUrl,
					width: imageWidth,
				},
			],
			locale: "en-US",
			siteName: SITE_NAME,
			title: pageTitle,
			type: "website",
			url: pageUrl,
		},
		title: {
			default: title,
			template: `%s | ${SITE_NAME}`,
		},
		twitter: {
			card: "summary_large_image",
			creator: SITE_SOCIAL_MEDIA_IDS.twitter,
			description,
			images: [
				{
					alt: title,
					height: imageHeight,
					url: imageUrl,
					width: imageWidth,
				},
			],
			title: pageTitle,
		},
	};
}

export const rootMetaData = generatePageMetadata({});
