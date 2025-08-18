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
import { GeminiAiIcon } from "../../icons/gemeniAiIcon";
import ImageIcon from "../../icons/imageIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type SingleListData, type UserTagsData } from "../../types/apiTypes";
import { BOOKMARKS_KEY } from "../../utils/constants";
import { Icon } from "../atoms/icon";
import Spinner from "../spinner";

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
const MyComponent = () => {
	const { currentIndex } = useLightboxState();
	const [showMore, setShowMore] = useState(false);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const descriptionRef = useRef<HTMLParagraphElement>(null);

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const previousData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		CATEGORY_ID,
		"date-sort-acending",
	]) as { pages: Array<{ data: SingleListData[] }> } | undefined;
	const router = useRouter();

	const { id } = router.query;
	const { data: bookmark } = useFetchBookmarkById(id as string);
	let currentBookmark;
	// handling the case where user opens a preview link directly
	if (!previousData) {
		// @ts-expect-error bookmark is not undefined
		currentBookmark = bookmark?.data?.[0];
	} else {
		currentBookmark = previousData?.pages?.flatMap(
			(page) => page?.data ?? [],
		)?.[currentIndex];
	}

	const metaData = currentBookmark?.meta_data;
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);
	useEffect(() => {
		setShowMore(false);
		setIsOverflowing(false);
		if (descriptionRef?.current) {
			// Check if text overflows
			const element = descriptionRef?.current;
			setIsOverflowing(element?.scrollHeight > element?.clientHeight);
		}
	}, [currentBookmark?.id]);

	if (!currentBookmark) return <Spinner />;
	const domain = new URL(currentBookmark?.url)?.hostname;
	return (
		<AnimatePresence>
			{lightboxShowSidepane && (
				<motion.div
					animate={{
						x: 0,
						transition: { type: "tween", duration: 0.15, ease: "easeInOut" },
					}}
					className="absolute right-0 top-0 flex h-full w-1/5 min-w-[320px] max-w-[400px] flex-col border-[0.5px] border-[rgba(0,0,0,0.13)] bg-[rgba(255,255,255,0.98)] backdrop-blur-[41px]"
					exit={{
						x: "100%",
						transition: { type: "tween", duration: 0.25, ease: "easeInOut" },
					}}
					initial={{ x: "100%" }}
				>
					<div className="flex flex-1 flex-col p-5 text-left  ">
						{currentBookmark?.title && (
							<div>
								<p
									className="pb-2 align-middle text-[14px] font-medium leading-[115%] tracking-[1%] text-[#171717]"
									tabIndex={-1}
								>
									{currentBookmark.title}
								</p>
							</div>
						)}
						{domain && (
							<p
								className=" pb-4 align-middle text-[13px] font-[450] leading-[115%] tracking-[1%] text-[#858585]"
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
							</p>
						)}
						{currentBookmark?.description && (
							<div>
								<p
									className={`${
										showMore ? "" : "line-clamp-4"
									} text-clip text-[13px] leading-[138%] tracking-[1%] text-[rgba(55,65,81,1)]`}
									ref={descriptionRef}
									tabIndex={-1}
								>
									{currentBookmark.description}
								</p>
								{isOverflowing && (
									<button
										className="text-[13px] font-[450] leading-[115%] tracking-[1%] text-[rgba(133,133,133,1)]"
										onClick={() => setShowMore(!showMore)}
										type="button"
									>
										{showMore ? "Show less" : "Show more"}
									</button>
								)}
							</div>
						)}
						<AddToCollectionDropdown bookmarkId={currentBookmark?.id} />
					</div>
					{(currentBookmark?.addedTags?.length > 0 ||
						metaData?.img_caption) && (
						<motion.div
							animate={{
								y: isExpanded ? 0 : "calc(100% - 70px)",
								transition: {
									type: "spring",
									damping: 25,
									stiffness: 300,
									delay: 0,
									only: ["y"],
								},
							}}
							className="relative overflow-hidden"
							initial={{ y: "100%" }}
						>
							{currentBookmark?.addedTags?.length > 0 && (
								<div className="px-5 pb-[19px]">
									<div className="flex flex-wrap gap-[6px]">
										{currentBookmark?.addedTags?.map((tag: UserTagsData) => (
											<span
												className="align-middle text-[13px] font-[450] leading-[115%] tracking-[1%] text-[rgba(133,133,133,1)]"
												key={tag.id}
											>
												#{tag.name}
											</span>
										))}
									</div>
								</div>
							)}
							{metaData?.img_caption && (
								<div className="relative px-5 py-3 text-sm">
									<motion.div
										className="mb-2 flex cursor-pointer items-center gap-2"
										onClick={() => setIsExpanded(!isExpanded)}
										whileTap={{ scale: 0.98 }}
									>
										<Icon className="h-[15px] w-[15px]">
											<GeminiAiIcon />
										</Icon>
										<p className="align-middle text-[13px] font-[450] leading-[115%] tracking-[1%] text-[#858585]">
											AI Summary
										</p>
									</motion.div>
									<div className="max-h-[200px] overflow-y-auto">
										<p className="text-[13px] leading-[138%] tracking-[1%] text-[#858585]">
											{metaData?.img_caption}
										</p>
									</div>
								</div>
							)}
							{/* Gradient overlay */}
							{!isExpanded && (
								<div
									className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[200px]"
									style={{
										background:
											"linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 100%)",
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
