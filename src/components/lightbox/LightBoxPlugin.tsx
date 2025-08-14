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
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import CollectionPlaceholderIcon from "../../icons/collectionPlaceholderIcon";
import ImageIcon from "../../icons/imageIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type SingleListData } from "../../types/apiTypes";
import { BOOKMARKS_KEY } from "../../utils/constants";

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

	if (!currentBookmark) return null;
	const domain = new URL(currentBookmark?.url)?.hostname;
	console.log(currentBookmark);
	return (
		<AnimatePresence>
			{lightboxShowSidepane && (
				<motion.div
					animate={{
						x: 0,
						transition: { type: "tween", duration: 0.15, ease: "easeInOut" },
					}}
					className="absolute right-0 top-0 flex h-full w-1/5 flex-col border border-[rgba(0,0,0,0.13)] bg-white"
					exit={{
						x: "100%",
						transition: { type: "tween", duration: 0.25, ease: "easeInOut" },
					}}
					initial={{ x: "100%" }}
				>
					<div className="flex flex-1 flex-col  overflow-y-auto p-5 text-left text-sm text-gray-800">
						{currentBookmark?.title && (
							<div>
								<p
									className="truncate pb-2 align-middle text-[14px] font-medium leading-[115%] tracking-[1%] text-[#171717]"
									tabIndex={-1}
								>
									{currentBookmark.title}
								</p>
							</div>
						)}
						{domain && (
							<p
								className="pb-4 align-middle text-[13px] font-[450] leading-[115%] tracking-[1%] text-[#858585]"
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
									<span>{domain}</span>
									<span>·</span>
									{currentBookmark?.inserted_at && (
										<span>{formatDate(currentBookmark?.inserted_at)}</span>
									)}
								</div>
							</p>
						)}
						{currentBookmark?.description && (
							<div>
								<p
									className="text-[13px] leading-[138%] tracking-[1%] text-[rgba(55,65,81,1)]"
									tabIndex={-1}
								>
									{currentBookmark.description}
								</p>
							</div>
						)}
						<div className="flex items-center gap-2 pt-[22px] text-[13px] leading-[138%] tracking-[1%] text-[#858585]">
							<div className="h-[14px] w-[14px]">
								<AddToCollectionsButton />
							</div>
							<span>Add to collection</span>
						</div>
					</div>
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
