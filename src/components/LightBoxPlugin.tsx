// plugins/MetaButtonPlugin.tsx
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

import { useFetchBookmarkById } from "../async/queryHooks/bookmarks/useFetchBookmarkById";
import useGetCurrentCategoryId from "../hooks/useGetCurrentCategoryId";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../store/componentStore";
import { type SingleListData } from "../types/apiTypes";
import { BOOKMARKS_KEY } from "../utils/constants";

const formatDate = (dateString: string) => {
	try {
		return format(new Date(dateString), "MMM d, yyyy");
	} catch {
		return "";
	}
};

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
	if (!previousData) {
		// @ts-expect-error bookmark is not undefined
		currentBookmark = bookmark?.data?.[0];
	} else {
		currentBookmark = previousData?.pages.flatMap((page) => page?.data ?? [])?.[
			currentIndex
		];
	}

	const metaData = currentBookmark?.meta_data;
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);

	if (!currentBookmark) return null;
	const domain = new URL(currentBookmark.url).hostname;

	return (
		<AnimatePresence>
			{lightboxShowSidepane && (
				<motion.div
					animate={{
						x: 0,
						transition: { type: "tween", duration: 0.15, ease: "easeInOut" },
					}}
					className="absolute right-0 top-0 flex h-full w-1/5 flex-col border-l border-gray-200 bg-white/90 shadow-xl backdrop-blur-xl"
					exit={{
						x: "100%",
						transition: { type: "tween", duration: 0.25, ease: "easeInOut" },
					}}
					initial={{ x: "100%" }}
				>
					<div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
						<div className="flex items-center space-x-2">
							{metaData?.favIcon && (
								<Image
									alt=""
									className="h-5 w-5 rounded"
									height={16}
									onError={(error) => {
										const target = error.target as HTMLImageElement;
										target.style.display = "none";
									}}
									src={metaData.favIcon}
									width={16}
								/>
							)}
							<span className="font-medium text-gray-700" tabIndex={-1}>
								Meta Data
							</span>
						</div>
					</div>
					<div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-gray-800">
						{currentBookmark.title && (
							<div>
								<p className="text-xs text-gray-500" tabIndex={-1}>
									Title
								</p>
								<p className="font-medium" tabIndex={-1}>
									{currentBookmark.title}
								</p>
							</div>
						)}
						{domain && (
							<div>
								<p className="text-xs text-gray-500" tabIndex={-1}>
									Domain
								</p>
								<p tabIndex={-1}>{domain}</p>
							</div>
						)}
						{currentBookmark.description && (
							<div>
								<p className="text-xs text-gray-500" tabIndex={-1}>
									Description
								</p>
								<p className="text-gray-700" tabIndex={-1}>
									{currentBookmark.description}
								</p>
							</div>
						)}
						{currentBookmark.inserted_at && (
							<div>
								<p className="text-xs text-gray-500" tabIndex={-1}>
									Saved on
								</p>
								<p tabIndex={-1}>{formatDate(currentBookmark.inserted_at)}</p>
							</div>
						)}
						{currentBookmark.url && (
							<div>
								<p className="text-xs text-gray-500" tabIndex={-1}>
									URL
								</p>
								<a
									className="break-all text-blue-600 underline"
									href={currentBookmark.url}
									rel="noopener noreferrer"
									tabIndex={-1}
									target="_blank"
								>
									{currentBookmark.url}
								</a>
							</div>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

const myModule = createModule("MyModule", MyComponent);

export default function MetaButtonPlugin(): Plugin {
	return ({ addSibling }) => {
		addSibling("controller", myModule, false);
	};
}
