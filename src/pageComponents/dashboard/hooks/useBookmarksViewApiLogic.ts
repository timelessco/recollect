import { type RefObject } from "react";
import find from "lodash/find";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";

import { useUpdateCategoryOptimisticMutation } from "../../../async/mutationHooks/category/use-update-category-optimistic-mutation";
import useUpdateSharedCategoriesOptimisticMutation from "../../../async/mutationHooks/share/useUpdateSharedCategoriesOptimisticMutation";
import useUpdateUserProfileOptimisticMutation from "../../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchCategories from "../../../async/queryHooks/category/useFetchCategories";
import useFetchSharedCategories from "../../../async/queryHooks/share/useFetchSharedCategories";
import useFetchUserProfile from "../../../async/queryHooks/user/useFetchUserProfile";
import {
	useLoadersStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type ProfilesBookmarksView,
} from "../../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../../types/componentStoreTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { EVERYTHING_URL, viewValues } from "../../../utils/constants";
import {
	getPageViewData,
	getPageViewKey,
	isLegacyBookmarksView,
} from "../../../utils/bookmarksViewKeyed";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";

type UseBookmarksViewApiLogicParams = {
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	categorySlug: string | null;
};

export function useBookmarksViewApiLogic({
	scrollContainerRef,
	categorySlug,
}: UseBookmarksViewApiLogicParams) {
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { allCategories } = useFetchCategories();
	const { sharedCategoriesData } = useFetchSharedCategories();
	const { userProfileData } = useFetchUserProfile();
	const toggleIsSortByLoading = useLoadersStore(
		(state) => state.toggleIsSortByLoading,
	);
	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();
	const { updateSharedCategoriesOptimisticMutation } =
		useUpdateSharedCategoriesOptimisticMutation();
	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();
	const session = useSupabaseSession((state) => state.session);

	return (
		value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => {
		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		);
		const isUserTheCategoryOwner =
			session?.user?.id === currentCategory?.user_id?.id;

		const mutationCall = (updateValue: string) => {
			if (updateValue === "sortBy") {
				toggleIsSortByLoading();
			}

			const cardContentViewLogic = (
				existingViewData: BookmarkViewDataTypes["cardContentViewArray"],
			) => {
				if (value === "moodboard" && !existingViewData?.includes("cover")) {
					return ["cover", ...existingViewData];
				}

				if (value === "card" && !existingViewData?.includes("cover")) {
					return ["cover", ...existingViewData];
				}

				if (value === "list" && !existingViewData?.includes("title")) {
					return ["title", ...existingViewData];
				}

				return existingViewData;
			};

			if (currentCategory && typeof CATEGORY_ID === "number") {
				if (isUserTheCategoryOwner) {
					updateCategoryOptimisticMutation.mutate({
						category_id: CATEGORY_ID,
						updateData: {
							category_views: {
								...currentCategory.category_views,
								cardContentViewArray: cardContentViewLogic(
									currentCategory.category_views.cardContentViewArray,
								),
								[updateValue]: value,
							},
						},
					});
				} else {
					const sharedCategoriesId = find(
						sharedCategoriesData?.data,
						(item) => item?.category_id === CATEGORY_ID,
					)?.id;

					if (sharedCategoriesId !== undefined) {
						const existingSharedCollectionViewsData = find(
							sharedCategoriesData?.data,
							(item) => item?.id === sharedCategoriesId,
						);

						if (!isNil(existingSharedCollectionViewsData)) {
							void mutationApiCall(
								updateSharedCategoriesOptimisticMutation.mutateAsync({
									id: sharedCategoriesId,
									updateData: {
										category_views: {
											...existingSharedCollectionViewsData?.category_views,
											cardContentViewArray: cardContentViewLogic(
												existingSharedCollectionViewsData?.category_views
													?.cardContentViewArray,
											),
											[updateValue]: value,
										},
									},
								}),
							);
						}
					}
				}
			} else {
				if (updateValue === "sortBy" && !isNull(scrollContainerRef?.current)) {
					scrollContainerRef.current.scrollTo(0, 0);
				}

				if (!isNull(userProfileData?.data) && !isNil(userProfileData)) {
					const raw = userProfileData.data[0]?.bookmarks_view;
					const pageKey = getPageViewKey(categorySlug);
					const defaultPageView: BookmarkViewDataTypes = {
						bookmarksView: viewValues.moodboard as BookmarksViewTypes,
						cardContentViewArray: ["cover", "title", "info"],
						moodboardColumns: [30],
						sortBy: "date-sort-acending" as BookmarksSortByTypes,
					};
					const keyed: ProfilesBookmarksView =
						!raw || typeof raw !== "object"
							? { [EVERYTHING_URL]: defaultPageView }
							: isLegacyBookmarksView(raw)
								? { [EVERYTHING_URL]: raw }
								: ({ ...raw } as ProfilesBookmarksView);

					const pageView = getPageViewData(raw, pageKey) ?? defaultPageView;
					const updatedPageView: BookmarkViewDataTypes = {
						...pageView,
						cardContentViewArray: cardContentViewLogic(
							(pageView.cardContentViewArray ??
								defaultPageView.cardContentViewArray) as string[],
						),
						[updateValue]: value,
					};
					const nextKeyed: ProfilesBookmarksView = {
						...keyed,
						[pageKey]: updatedPageView,
					};

					void mutationApiCall(
						updateUserProfileOptimisticMutation.mutateAsync({
							updateData: { bookmarks_view: nextKeyed },
						}),
					);
				}
			}
		};

		switch (type) {
			case "view":
				mutationCall("bookmarksView");
				break;
			case "info":
				mutationCall("cardContentViewArray");
				break;
			case "colums":
				mutationCall("moodboardColumns");
				break;
			case "sort":
				mutationCall("sortBy");
				break;
			default:
				break;
		}
	};
}
