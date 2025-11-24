import { useRouter } from "next/router";

import "yet-another-react-lightbox/styles.css";

import { useEffect, useState } from "react";

import { useFetchBookmarkById } from "../../../async/queryHooks/bookmarks/useFetchBookmarkById";
import { CustomLightBox } from "../../../components/lightbox/LightBox";
import { Spinner } from "../../../components/spinner";
import { type SingleListData } from "../../../types/apiTypes";
import { ALL_BOOKMARKS_URL } from "../../../utils/constants";

export type BookmarkResponse = {
	data: SingleListData[];
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

	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
		void router.push(`/${ALL_BOOKMARKS_URL}`);
	};

	// Handle redirects in useEffect to prevent SSR issues
	useEffect(() => {
		if (router.isReady && ((!isLoading && !bookmark?.data?.[0]) || error)) {
			void router.push(`/${ALL_BOOKMARKS_URL}`);
		}
	}, [router, isLoading, bookmark, error]);

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

	if (!bookmark?.data?.[0] || error) {
		return <div />;
	}

	const bookmarkData = bookmark?.data?.[0];

	return (
		<CustomLightBox
			activeIndex={0}
			bookmarks={[bookmarkData]}
			handleClose={handleClose}
			isOpen={isOpen}
			setActiveIndex={() => {}}
		/>
	);
};

export default Preview;
