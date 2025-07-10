import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import "yet-another-react-lightbox/styles.css";

import { div } from "motion/dist/react-m";

import { useFetchBookmarkById } from "../../../async/queryHooks/bookmarks/useFetchBookmarkById";
import { CustomLightBox } from "../../../components/LightBox";
import Spinner from "../../../components/spinner";
import { ALL_BOOKMARKS_URL } from "../../../utils/constants";

type BookmarkData = {
	category_id: number;
	description: string;
	id: number;
	inserted_at: string;
	meta_data: {
		favIcon: string | null;
		height: number;
		img_caption: string | null;
		ocr: string | null;
		ogImgBlurUrl: string;
		twitter_avatar_url: string | null;
		width: number;
	};
	ogImage: string;
	screenshot: string | null;
	sort_index: number | null;
	title: string;
	trash: boolean;
	type: string;
	url: string;
	user_id: string;
};

export type BookmarkResponse = {
	data: BookmarkData[];
	error: string | null;
};

const Preview = () => {
	const router = useRouter();
	const { id } = router.query;
	const {
		data: bookmark,
		isLoading,
		error,
	} = useFetchBookmarkById(id as string) as {
		data: BookmarkResponse | undefined;
		error: Error | null;
		isLoading: boolean;
	};

	if ((!isLoading && !bookmark?.data?.[0]) || error) {
		void router.push(`/${ALL_BOOKMARKS_URL}`);
	}

	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
		void router.push(`/${ALL_BOOKMARKS_URL}`);
	};

	if (isLoading)
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner />
			</div>
		);

	if (!bookmark?.data?.[0] || error) {
		return <div />;
	}

	const bookmarkData = bookmark.data[0];
	const transformedBookmark = {
		id: bookmarkData.id,
		ogImage: bookmarkData.ogImage,
		type: bookmarkData.type,
		url: bookmarkData.url,
		title: bookmarkData.title,
		description: bookmarkData.description,
		domain: new URL(bookmarkData.url).hostname,
		meta_data: {
			height: bookmarkData.meta_data.height,
			width: bookmarkData.meta_data.width,
		},
	};

	return (
		<CustomLightBox
			activeIndex={0}
			bookmarks={[transformedBookmark]}
			handleClose={handleClose}
			isOpen={isOpen}
			setActiveIndex={() => {}}
		/>
	);
};

export default Preview;
