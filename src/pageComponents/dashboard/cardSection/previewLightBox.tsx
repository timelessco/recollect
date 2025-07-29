import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { type DraggableItemProps } from "react-aria";
import { type Slide as BaseSlide } from "yet-another-react-lightbox";

import { CustomLightBox } from "../../../components/lightbox/LightBox";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { useSupabaseSession } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";
import {
	ALL_BOOKMARKS_URL,
	BOOKMARKS_KEY,
	CATEGORY_ID_PATHNAME,
} from "../../../utils/constants";

export type CustomSlide = BaseSlide & {
	data?: {
		type?: string;
	};
	placeholder?: string;
};

type PreviewLightBoxProps = {
	id: DraggableItemProps["key"];
	open: boolean;
	setOpen: (value: boolean) => void;
};

export const PreviewLightBox = ({
	id,
	open,
	setOpen,
}: PreviewLightBoxProps) => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const [isClosing, setIsClosing] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const _previousOpenRef = useRef(open);

	// Get and transform bookmarks from query cache
	const bookmarks = useMemo(() => {
		const previousData = queryClient.getQueryData([
			BOOKMARKS_KEY,
			session?.user?.id,
			CATEGORY_ID,
			"date-sort-acending",
		]) as { pages: Array<{ data: SingleListData[] }> } | undefined;

		const rawBookmarks =
			previousData?.pages.flatMap((page) => page?.data ?? []) ?? [];

		// Transform SingleListData to match the expected type in CustomLightBox
		return rawBookmarks;
	}, [queryClient, session?.user?.id, CATEGORY_ID]);

	// Only update activeIndex when the lightbox is being opened
	useEffect(() => {
		if (!bookmarks.length) return;
		const wasOpen = _previousOpenRef.current;

		// Only set activeIndex when the lightbox is being opened
		if (open && !wasOpen) {
			const newIndex = bookmarks.findIndex(
				(bookmark) => String(bookmark?.id) === String(id),
			);
			if (newIndex !== -1) {
				setActiveIndex(newIndex);
			}
		}

		_previousOpenRef.current = open;
	}, [open, bookmarks, id]);

	// Handle close animation and cleanup
	const handleClose = useCallback(() => {
		if (isClosing || !open) {
			return undefined;
		}

		setIsClosing(true);
		setOpen(false);

		// Update URL without page reload
		// Clean up path by removing leading slashes
		void router.push(
			{
				pathname: `/${CATEGORY_ID_PATHNAME}`,
				query: {
					category_id: router?.query.category_id ?? ALL_BOOKMARKS_URL,
				},
			},
			`/${router?.asPath?.split("/")?.[1]}`,
			{ shallow: true },
		);

		// Reset state after animation
		const timer = setTimeout(() => {
			setIsClosing(false);
			setActiveIndex(-1);
		}, 50);

		return () => {
			clearTimeout(timer);
		};
	}, [open, isClosing, setOpen, router]);

	// using window event listener to handle browser back button for now
	useEffect(() => {
		const handlePopState = () => {
			void router.replace(
				{
					pathname: `/${CATEGORY_ID_PATHNAME}`,
					query: {
						category_id: router?.query.category_id ?? ALL_BOOKMARKS_URL,
					},
				},
				`/${router?.asPath?.split("/")?.[1]}`,
				{ shallow: true },
			);

			if (open) {
				handleClose();
			}
		};

		window.addEventListener("popstate", handlePopState);
		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	}, [open, handleClose, router]);

	useEffect(
		() => () => {
			setIsClosing(false);
		},
		[],
	);

	// Only render CustomLightBox when activeIndex is valid
	if (!open || isClosing || activeIndex === -1) {
		return null;
	}

	return (
		<CustomLightBox
			activeIndex={activeIndex}
			bookmarks={bookmarks}
			handleClose={handleClose}
			isOpen={open}
			isPage
			setActiveIndex={setActiveIndex}
		/>
	);
};
