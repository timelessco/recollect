import { useRouter } from "next/router";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useMounted } from "../../../hooks/useMounted";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";
import { DISCOVER_URL } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";
import {
	getCategorySlugFromRouter,
	getPublicPageInfo,
} from "../../../utils/url";
import {
	buildAuthenticatedPreviewUrl,
	buildPublicPreviewUrl,
} from "../../../utils/url-builders";

type PublicMoodboardVirtualizedProps = {
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	renderCard: (bookmark: SingleListData) => React.ReactNode;
};

const getScrollElement = (): HTMLElement | null => {
	if (typeof document === "undefined") {
		return null;
	}

	return document.querySelector("#scrollableDiv") as HTMLElement | null;
};

/**
 * Virtualized moodboard for public/discover pages. Uses @tanstack/react-virtual
 * with the same scroll container (#scrollableDiv) as InfiniteScroll.
 */
export const PublicMoodboardVirtualized = ({
	bookmarksColumns,
	bookmarksList,
	renderCard,
}: PublicMoodboardVirtualizedProps) => {
	const router = useRouter();
	const mounted = useMounted();
	const { isMobile, isTablet } = useIsMobileView();
	const { setLightboxId, setLightboxOpen } = useMiscellaneousStore();

	const lanes = getColumnCount(
		mounted ? !isMobile && !isTablet : true,
		bookmarksColumns[0],
	);

	const rowVirtualizer = useVirtualizer({
		count: bookmarksList.length,
		getScrollElement,
		measureElement: (element) => element.getBoundingClientRect().height,
		estimateSize: () => {
			const containerWidth =
				typeof document !== "undefined"
					? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1_200)
					: 1_200;
			const cardWidth = containerWidth / lanes;
			return cardWidth * (4 / 3);
		},
		overscan: 5,
		lanes,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div
			className="relative w-full"
			style={{ height: rowVirtualizer.getTotalSize() }}
		>
			{virtualItems.map((virtualRow) => {
				const bookmark = bookmarksList[virtualRow.index];
				if (!bookmark) {
					return null;
				}

				const columnWidth = 100 / lanes;

				return (
					<div
						key={bookmark.id}
						data-index={virtualRow.index}
						ref={rowVirtualizer.measureElement}
						className="absolute top-0 pr-3 pb-6 pl-3"
						style={{
							left: `${virtualRow.lane * columnWidth}%`,
							width: `${columnWidth}%`,
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						<div className="group relative mb-6 flex rounded-lg outline-hidden duration-150 hover:shadow-lg">
							<a
								aria-label={bookmark.title ?? "Open bookmark"}
								className="absolute inset-0 top-0 left-0 z-10 cursor-pointer rounded-lg"
								href={bookmark.url ?? "#"}
								onClick={(event) => {
									event.preventDefault();
									setLightboxId(String(bookmark.id));
									setLightboxOpen(true);
									const publicInfo = getPublicPageInfo(router);
									if (publicInfo) {
										const { pathname, query, as } = buildPublicPreviewUrl({
											publicInfo,
											bookmarkId: bookmark.id,
										});
										void router.push({ pathname, query }, as, {
											shallow: true,
										});
									} else {
										const categorySlug = getCategorySlugFromRouter(router);
										if (categorySlug === DISCOVER_URL) {
											const { pathname, query, as } =
												buildAuthenticatedPreviewUrl({
													categorySlug,
													bookmarkId: bookmark.id,
												});
											void router.push({ pathname, query }, as, {
												shallow: true,
											});
										}
									}
								}}
							/>
							{renderCard(bookmark)}
						</div>
					</div>
				);
			})}
		</div>
	);
};
