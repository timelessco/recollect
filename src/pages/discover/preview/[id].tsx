import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import "yet-another-react-lightbox/styles.css";

import { useFetchDiscoverableBookmarkById } from "../../../async/queryHooks/bookmarks/use-fetch-discoverable-bookmark-by-id";
import { CustomLightBox } from "../../../components/lightbox/LightBox";
import { Spinner } from "../../../components/spinner";
import { DISCOVER_URL } from "../../../utils/constants";

const DiscoverPreview = () => {
	const router = useRouter();
	const { id } = router.query;

	const { bookmark, isLoading, error } = useFetchDiscoverableBookmarkById(
		id as string,
	);

	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
		void router.push(`/${DISCOVER_URL}`);
	};

	// Handle redirects in useEffect to prevent SSR issues
	useEffect(() => {
		if (router.isReady && ((!isLoading && !bookmark) || error)) {
			void router.push(`/${DISCOVER_URL}`);
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

	if (!bookmark || error) {
		return <div />;
	}

	return (
		<CustomLightBox
			activeIndex={0}
			bookmarks={[bookmark]}
			handleClose={handleClose}
			isOpen={isOpen}
			setActiveIndex={() => {}}
		/>
	);
};

export default DiscoverPreview;
