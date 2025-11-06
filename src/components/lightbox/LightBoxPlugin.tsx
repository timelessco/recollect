/**
 * LightBoxPlugin Component
 *
 * A custom plugin for the react-lightbox component that displays metadata in a side pane.
 * Features:
 * - Shows bookmark metadata including title, description, and domain
 * - Displays favicon when available
 * - Formats dates for better readability
 * - Integrates with the main lightbox component for a seamless experience
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import {
	createModule,
	useLightboxState,
	type Plugin,
} from "yet-another-react-lightbox";

import { useFetchBookmarkById } from "../../async/queryHooks/bookmarks/useFetchBookmarkById";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import { GeminiAiIcon } from "../../icons/gemeniAiIcon";
import ImageIcon from "../../icons/imageIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import {
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../types/apiTypes";
import { BOOKMARKS_KEY, CATEGORIES_KEY } from "../../utils/constants";
import { searchSlugKey } from "../../utils/helpers";
import { Icon } from "../atoms/icon";
import { Spinner } from "../spinner";

import { AddToCollectionDropdown } from "./AddToCollectionDropdown";

/**
 * Formats a date string into a more readable format (e.g., "Jan 1, 2023")
 * @param dateString - The date string to format
 * @returns Formatted date string or empty string if invalid
 */
const formatDate = (dateString: string) => {
	try {
		return format(new Date(dateString), "MMM d, yyyy");
	} catch {
		return "";
	}
};

/**
 * Main component that renders the metadata panel in the lightbox
 * Fetches and displays bookmark details including title, domain, description, and URL
 */
// eslint-disable-next-line complexity
const MyComponent = () => {
	const { currentIndex } = useLightboxState();
	const [showMore, setShowMore] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const descriptionRef = useRef<HTMLParagraphElement>(null);

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const { sortBy } = useGetSortBy();

	// if there is text in searchbar we get the chache of searched data else we get from all bookmarks
	const previousData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		searchText ? searchSlugKey(categoryData) : CATEGORY_ID,
		searchText ? searchText : sortBy,
	]) as {
		data: SingleListData[];
		pages: Array<{ data: SingleListData[] }>;
	};
	const router = useRouter();

	const { id } = router.query;
	const shouldFetch = !previousData && Boolean(id);

	const { data: bookmark } = useFetchBookmarkById(id as string, {
		enabled: shouldFetch,
	});
	let currentBookmark;
	let allBookmarksData;
	// handling the case where user opens a preview link directly
	if (!previousData) {
		// @ts-expect-error bookmark is not undefined
		currentBookmark = bookmark?.data?.[0];
		allBookmarksData = bookmark?.data;
	} else {
		currentBookmark = previousData?.pages?.flatMap(
			(page) => page?.data ?? [],
		)?.[currentIndex];
		allBookmarksData = previousData?.pages?.flatMap((page) => page?.data ?? []);
	}

	const [hasAIOverflowContent, setHasAIOverflowContent] = useState(false);
	const expandableRef = useRef<HTMLDivElement>(null);

	const metaData = currentBookmark?.meta_data;
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);
	useEffect(() => {
		setShowMore(false);
		setIsExpanded(false);

		// Use setTimeout to ensure DOM has updated
		setTimeout(() => {
			if (expandableRef?.current) {
				const contentHeight = expandableRef?.current?.scrollHeight;
				setHasAIOverflowContent(contentHeight > 120);
			}

			if (descriptionRef?.current) {
				// Check if text overflows
				const element = descriptionRef?.current;
				setIsOverflowing(element?.scrollHeight > element?.clientHeight);
			}
		}, 0);
	}, [currentBookmark?.id, currentIndex, lightboxShowSidepane]);

	if (!currentBookmark) {
		return (
			<div className="absolute right-0 top-0 flex h-full w-1/5 min-w-[320px] max-w-[400px] flex-col items-center justify-center border-l-[0.5px] border-gray-100 bg-gray-0 backdrop-blur-[41px]">
				<Spinner
					className="h-3 w-3 animate-spin"
					style={{ color: "var(--plain-reverse-color)" }}
				/>
			</div>
		);
	}

	const domain = new URL(currentBookmark?.url)?.hostname;
	return (
		<AnimatePresence>
			{lightboxShowSidepane && (
				<motion.div
					animate={{
						x: 0,
						transition: { type: "tween", duration: 0.15, ease: "easeInOut" },
					}}
					className="absolute right-0 top-0 flex h-full w-1/5 min-w-[320px] max-w-[400px] flex-col border-l-[0.5px] border-gray-100 bg-gray-0 backdrop-blur-[41px]"
					exit={{
						x: "100%",
						transition: { type: "tween", duration: 0.25, ease: "easeInOut" },
					}}
					initial={{ x: "100%" }}
				>
					<div className="flex flex-1 flex-col p-5 text-left">
						{currentBookmark?.title && (
							<div>
								<p
									className="pb-2 align-middle text-[14px] font-medium leading-[115%] tracking-[0.01em] text-gray-900"
									tabIndex={-1}
								>
									{currentBookmark.title}
								</p>
							</div>
						)}
						{domain && (
							<div
								className="pb-4 align-middle text-[13px] font-[450] leading-[115%] tracking-[0.01em] text-gray-600"
								tabIndex={-1}
							>
								<div className="flex items-center gap-1 text-[13px] leading-[138%]">
									{metaData?.favIcon ? (
										<Image
											alt="favicon"
											className="h-[15px] w-[15px] rounded"
											height={16}
											onError={(error) => {
												const target = error?.target as HTMLImageElement;
												target.style.display = "none";
											}}
											src={metaData?.favIcon}
											width={16}
										/>
									) : (
										<ImageIcon size="15" />
									)}
									<span className="truncate">{domain}</span>
									<span>·</span>
									{currentBookmark?.inserted_at && (
										<span className="truncate">
											{formatDate(currentBookmark?.inserted_at)}
										</span>
									)}
								</div>
							</div>
						)}
						{currentBookmark?.description && (
							<div className="relative">
								<p
									className={`${
										showMore ? "" : "line-clamp-4"
									} text-clip text-[13px] font-normal leading-[139%] tracking-[0.01em] text-gray-800`}
									ref={descriptionRef}
									tabIndex={-1}
								>
									{currentBookmark.description}
									{showMore && isOverflowing && (
										<button
											className="inline text-[13px] leading-[138%] tracking-[0.01em] text-gray-800"
											onClick={() => setShowMore(false)}
											type="button"
										>
											Show less
										</button>
									)}
								</p>
								{isOverflowing && !showMore && (
									<button
										className="absolute bottom-0 right-0 bg-gray-0 pl-1 text-[13px] leading-[138%] tracking-[0.01em] text-gray-800"
										onClick={() => setShowMore(true)}
										type="button"
									>
										Show more
									</button>
								)}
							</div>
						)}
						<AddToCollectionDropdown
							allbookmarksdata={allBookmarksData as SingleListData[]}
							bookmarkId={currentBookmark?.id}
							shouldFetch={shouldFetch}
						/>
					</div>
					{(currentBookmark?.addedTags?.length > 0 ||
						metaData?.image_caption ||
						metaData?.img_caption ||
						metaData?.ocr) && (
						<motion.div
							animate={{ y: isExpanded ? 0 : "calc(100% - 100px)" }}
							className="relative overflow-hidden"
							initial={{ y: "calc(100% - 100px)" }}
							key={currentBookmark?.id}
							ref={expandableRef}
							transition={{
								type: "spring",
								damping: 25,
								stiffness: 300,
							}}
						>
							{currentBookmark?.addedTags?.length > 0 && (
								<div className="px-5 pb-[19px]">
									<div className="flex flex-wrap gap-[6px]">
										{currentBookmark?.addedTags?.map((tag: UserTagsData) => (
											<span
												className="align-middle text-[13px] font-[450] leading-[115%] tracking-[0.01em] text-gray-600"
												key={tag?.id}
											>
												#{tag?.name}
											</span>
										))}
									</div>
								</div>
							)}
							{(metaData?.img_caption ||
								metaData?.image_caption ||
								metaData?.ocr) && (
								<motion.div
									className={`relative px-5 py-3 text-sm ${
										hasAIOverflowContent ? "cursor-pointer" : ""
									}`}
									onClick={() =>
										hasAIOverflowContent && setIsExpanded(!isExpanded)
									}
									whileTap={hasAIOverflowContent ? { scale: 0.98 } : {}}
								>
									<div className="mb-2 flex items-center gap-2">
										<Icon className="h-[15px] w-[15px] text-gray-600">
											<GeminiAiIcon />
										</Icon>
										<p className="align-middle text-[13px] font-[450] leading-[115%] tracking-[0.01em] text-gray-600">
											AI Summary
										</p>
									</div>
									<div
										className={`max-h-[200px] ${
											isExpanded ? "overflow-y-auto" : ""
										}`}
									>
										<p className="text-[13px] leading-[138%] tracking-[0.01em] text-gray-500">
											{metaData?.img_caption || metaData?.image_caption}
											{(metaData?.img_caption || metaData?.image_caption) &&
												metaData?.ocr && <br />}
											{metaData?.ocr}
										</p>
									</div>
								</motion.div>
							)}
							{/* Gradient overlay */}
							{!isExpanded && hasAIOverflowContent && (
								<div
									className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[159px]"
									style={{
										background:
											"linear-gradient(180deg, var(--color-whites-50) 0%, var(--color-whites-800) 77%, var(--color-whites-1000) 100%)",
									}}
								/>
							)}
						</motion.div>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
};

// https://yet-another-react-lightbox.com/advanced
// Create a custom lightbox module with our metadata component
const myModule = createModule("MyModule", MyComponent);

/**
 * Plugin factory function that adds the metadata panel to the lightbox
 * @returns Plugin configuration for the lightbox
 */
export default function MetaButtonPlugin(): Plugin {
	// Register our metadata component as a sibling in the lightbox controller, please check the dom to see where it lands
	return ({ addSibling }) => {
		addSibling("controller", myModule, false);
	};
}
