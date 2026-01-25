import { type GetStaticPaths, type GetStaticProps } from "next";
import { useRouter } from "next/router";
import * as Sentry from "@sentry/nextjs";
import { format } from "date-fns";
import { z } from "zod";

import "yet-another-react-lightbox/styles.css";

import { useState } from "react";

import { CustomLightBox } from "../../../../../components/lightbox/LightBox";
import {
	type FetchDataResponse,
	type SingleListData,
} from "../../../../../types/apiTypes";
import {
	FETCH_PUBLIC_BOOKMARK_BY_ID_API,
	getBaseUrl,
} from "../../../../../utils/constants";
import { HttpStatus } from "../../../../../utils/error-utils/common";
import { buildPublicCategoryUrl } from "../../../../../utils/url-builders";

type FetchPublicBookmarkByIdResponse = FetchDataResponse<SingleListData | null>;

const PublicPreviewParamsSchema = z.object({
	bookmark_id: z
		.string()
		.regex(/^\d+$/u, "Bookmark ID must be numeric")
		.transform(Number),
	user_name: z
		.string()
		.regex(/^[\w-]{1,39}$/u, "Invalid username format")
		.min(1)
		.max(39),
	id: z
		.string()
		.regex(/^[\da-z-]+$/iu, "Invalid category slug format")
		.min(1)
		.max(100),
});

export type PublicPreviewProps = {
	bookmark: SingleListData;
};

const PublicPreview = (props: PublicPreviewProps) => {
	const { bookmark } = props;
	const router = useRouter();
	const { user_name, id: categorySlug } = router.query;

	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
		if (user_name && categorySlug) {
			const { pathname, query, as } = buildPublicCategoryUrl({
				user_name: user_name as string,
				category_slug: categorySlug as string,
			});
			void router.push({ pathname, query }, as, { shallow: true });
		}
	};

	return (
		<>
			<div className="sr-only">
				<h1>{bookmark.title || "Bookmark Preview"}</h1>
				{bookmark.description && <p>{bookmark.description}</p>}
				{bookmark.meta_data?.img_caption && (
					<p>{bookmark.meta_data.img_caption}</p>
				)}
				{bookmark.meta_data?.ocr && <p>{bookmark.meta_data.ocr}</p>}
				{bookmark.meta_data?.mediaType && <p>{bookmark.meta_data.mediaType}</p>}
				{bookmark.meta_data?.video_url && (
					<p>
						<a href={bookmark.meta_data.video_url} rel="noopener noreferrer">
							{bookmark.meta_data.video_url}
						</a>
					</p>
				)}
				{bookmark.url && (
					<p>
						<a href={bookmark.url} rel="noopener noreferrer">
							{bookmark.url}
						</a>
					</p>
				)}
				{bookmark.inserted_at && (
					<p>{format(new Date(bookmark.inserted_at), "MMM d, yyyy")}</p>
				)}
			</div>
			<CustomLightBox
				activeIndex={0}
				bookmarks={[bookmark]}
				handleClose={handleClose}
				isOpen={isOpen}
				setActiveIndex={() => {}}
			/>
		</>
	);
};

export const getStaticPaths: GetStaticPaths = async () => ({
	paths: [],
	fallback: "blocking",
});

export const getStaticProps: GetStaticProps<PublicPreviewProps> = async (
	context,
) => {
	const ROUTE = "/public/[user_name]/[id]/preview/[bookmark_id]";

	const validation = PublicPreviewParamsSchema.safeParse(context.params);
	if (!validation.success) {
		console.warn(`[${ROUTE}] Invalid route parameters`, {
			errors: validation.error.flatten(),
		});
		return { notFound: true };
	}

	const { bookmark_id, user_name, id: categorySlug } = validation.data;

	try {
		const response = await fetch(
			`${getBaseUrl()}${FETCH_PUBLIC_BOOKMARK_BY_ID_API}?bookmark_id=${bookmark_id}&user_name=${user_name}&category_slug=${categorySlug}`,
		);

		if (response.status === HttpStatus.NOT_FOUND) {
			console.warn(`[${ROUTE}] Bookmark not found`, {
				bookmark_id,
				user_name,
				categorySlug,
			});
			return { notFound: true };
		}

		if (!response.ok) {
			console.error(
				`[${ROUTE}] Failed to fetch public bookmark: HTTP ${response.status}`,
				{
					status: response.status,
					statusText: response.statusText,
					bookmark_id,
					user_name,
					categorySlug,
				},
			);
			Sentry.captureException(
				new Error(`HTTP ${response.status}: ${response.statusText}`),
				{
					tags: {
						operation: "fetch_public_bookmark",
						context: "incremental_static_regeneration",
					},
					extra: {
						status: response.status,
						statusText: response.statusText,
						bookmark_id,
						user_name,
						categorySlug,
					},
				},
			);
			return { notFound: true };
		}

		const data = (await response.json()) as FetchPublicBookmarkByIdResponse;

		if (!data?.data || data?.error) {
			console.warn(`[${ROUTE}] Bookmark data not found or contains error`, {
				error: data?.error,
				bookmark_id,
				user_name,
				categorySlug,
			});
			return { notFound: true };
		}

		return {
			props: {
				bookmark: data.data,
			},
			revalidate: 300,
		};
	} catch (error) {
		console.error(`[${ROUTE}] Unexpected error fetching public bookmark`, {
			error,
			bookmark_id,
			user_name,
			categorySlug,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "fetch_public_bookmark",
				context: "incremental_static_regeneration",
			},
			extra: { bookmark_id, user_name, categorySlug },
		});
		return { notFound: true };
	}
};

export default PublicPreview;
