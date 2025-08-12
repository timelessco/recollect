import { useRouter } from "next/router";

import "yet-another-react-lightbox/styles.css";

import { useState } from "react";

import { useFetchBookmarkById } from "../../../async/queryHooks/bookmarks/useFetchBookmarkById";
import { CustomLightBox } from "../../../components/lightbox/LightBox";
import Spinner from "../../../components/spinner";
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
