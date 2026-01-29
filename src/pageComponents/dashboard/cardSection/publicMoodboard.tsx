import { useRouter } from "next/router";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";
import { getColumnCount } from "../../../utils/helpers";
import { getPublicPageInfo } from "../../../utils/url";
import { buildPublicPreviewUrl } from "../../../utils/url-builders";

type PublicMoodboardProps = {
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	renderCard: (bookmark: SingleListData) => React.ReactNode;
};

/**
 * Moodboard-only, SSR-safe grid for public pages. No drag-and-drop, no listbox.
 * Uses same lane-based column layout as the virtualized moodboard.
 */
export const PublicMoodboard = ({
	bookmarksColumns,
	bookmarksList,
	renderCard,
}: PublicMoodboardProps) => {
	const router = useRouter();
	const { isMobile, isTablet } = useIsMobileView();
	const { setLightboxId, setLightboxOpen } = useMiscellaneousStore();

	const lanes = getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);
	const columns = Array.from({ length: lanes }, (_, col) =>
		bookmarksList.map((_, idx) => idx).filter((idx) => idx % lanes === col),
	);

	return (
		<div className="relative flex w-full">
			{columns.map((indices, colIndex) => (
				<div
					key={
						indices[0] !== undefined
							? (bookmarksList[indices[0]]?.id ?? indices[0])
							: `moodboard-col-${colIndex}`
					}
					className="min-w-0 flex-1 pr-3 pl-3"
				>
					{indices.map((idx) => {
						const bookmark = bookmarksList[idx];
						if (!bookmark) {
							return null;
						}

						return (
							<div
								key={bookmark.id}
								className="group relative flex rounded-lg pb-6 outline-hidden duration-150 hover:shadow-lg"
							>
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
										}
									}}
								/>
								{renderCard(bookmark)}
							</div>
						);
					})}
				</div>
			))}
		</div>
	);
};
