import { type GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { isEmpty } from "lodash";

import "yet-another-react-lightbox/styles.css";

import { useEffect, useState } from "react";
import axios from "axios";

import { CustomLightBox } from "../../../../../components/lightbox/LightBox";
import { Spinner } from "../../../../../components/spinner";
import {
	type GetPublicCategoryBookmarksApiResponseType,
	type SingleListData,
} from "../../../../../types/apiTypes";
import {
	FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../../../../utils/constants";

export type BookmarkResponse = {
	data: SingleListData[];
	error: string | null;
};

const PublicPreview = () => {
	const router = useRouter();
	const { bookmark_id, user_name, id: categorySlug } = router.query;
	const [bookmark, setBookmark] = useState<SingleListData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [isOpen, setIsOpen] = useState(true);

	// Fetch bookmark data
	useEffect(() => {
		if (!router.isReady || !bookmark_id || !user_name || !categorySlug) {
			return;
		}

		const fetchBookmark = async () => {
			try {
				setIsLoading(true);
				const response = await fetch(
					`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${categorySlug}&user_name=${user_name}`,
					{ method: "POST" },
				);
				const data =
					(await response.json()) as GetPublicCategoryBookmarksApiResponseType;

				if (!data?.is_public) {
					setError("This page is not public");
					setIsLoading(false);
					return;
				}

				const bookmarks = data?.data;
				if (isEmpty(bookmarks)) {
					setError("No bookmarks found");
					setIsLoading(false);
					return;
				}

				const foundBookmark = bookmarks?.find(
					(b) => String(b.id) === String(bookmark_id),
				);

				if (!foundBookmark) {
					setError("Bookmark not found");
					setIsLoading(false);
					return;
				}

				setBookmark(foundBookmark);
				setIsLoading(false);
			} catch {
				setError("Failed to fetch bookmark");
				setIsLoading(false);
			}
		};

		void fetchBookmark();
	}, [router.isReady, bookmark_id, user_name, categorySlug]);

	const handleClose = () => {
		setIsOpen(false);
		if (user_name && categorySlug) {
			void router.push(
				{
					pathname: `/public/[user_name]/[id]`,
					query: {
						user_name: user_name as string,
						id: categorySlug as string,
					},
				},
				`/public/${user_name}/${categorySlug}`,
				{
					shallow: true,
				},
			);
		}
	};

	// Handle redirects in useEffect to prevent SSR issues
	useEffect(() => {
		if (
			router.isReady &&
			!isLoading &&
			(!bookmark || error) &&
			user_name &&
			categorySlug
		) {
			void router.push(`/public/${user_name}/${categorySlug}`);
		}
	}, [
		router,
		isLoading,
		bookmark,
		error,
		user_name,
		categorySlug,
		router.isReady,
		router.push,
	]);

	// Wait for router to be ready before rendering
	if (!router.isReady || isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner
					className="h-3 w-3 animate-spin"
					style={{ color: "var(--color-plain-reverse)" }}
				/>
			</div>
		);
	}

	if (!bookmark || error) {
		return <div />;
	}

	return (
		<CustomLightBox
			activeIndex={0}
			bookmarks={[bookmark]}
			handleClose={handleClose}
			isOpen={isOpen}
			isPublicPage
			setActiveIndex={() => {}}
		/>
	);
};

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { bookmark_id, user_name, id: categorySlug } = context.query;

	if (!bookmark_id || !user_name || !categorySlug) {
		return {
			notFound: true,
		};
	}

	// Verify the category exists and is public
	try {
		const response =
			await axios.post<GetPublicCategoryBookmarksApiResponseType>(
				`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${
					categorySlug as string
				}&user_name=${user_name as string}`,
			);

		if (!response?.data?.is_public) {
			return {
				notFound: true,
			};
		}

		// Check if bookmark exists in the category
		const bookmarks = response?.data?.data;
		const bookmarkExists = bookmarks?.some(
			(b) => String(b.id) === String(bookmark_id),
		);

		if (!bookmarkExists) {
			return {
				notFound: true,
			};
		}

		return {
			props: {},
		};
	} catch {
		return {
			notFound: true,
		};
	}
};

export default PublicPreview;
