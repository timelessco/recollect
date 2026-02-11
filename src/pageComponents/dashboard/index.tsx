import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import find from "lodash/find";
import isNil from "lodash/isNil";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import useAddBookmarkMinDataOptimisticMutation from "../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useClearBookmarksInTrashMutation from "../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation";
import useFileUploadOptimisticMutation from "../../async/mutationHooks/files/useFileUploadOptimisticMutation";
import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import { fileUpload } from "../../async/uploads/file-upload";
import { useDeleteCollection } from "../../hooks/useDeleteCollection";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import useIsInNotFoundPage from "../../hooks/useIsInNotFoundPage";
import { mutationApiCall } from "../../utils/apiHelpers";
import { DISCOVER_URL } from "../../utils/constants";
import { errorToast } from "../../utils/toastMessages";
import { type CategoriesData } from "../../types/apiTypes";
import { type FileType } from "../../types/componentTypes";

import SettingsModal from "./modals/settingsModal";
import {
	useDashboardSession,
	useDashboardRouteInvalidation,
} from "./hooks/useDashboardSession";
import { useDashboardClipboardPaste } from "./hooks/useDashboardClipboardPaste";
import { useDashboardProfileSync } from "./hooks/useDashboardProfileSync";
import { useBookmarksViewApiLogic } from "./hooks/useBookmarksViewApiLogic";
import { DashboardBookmarksPane } from "./DashboardBookmarksPane";
import { DashboardMainPane } from "./DashboardMainPane";

const DashboardLayout = dynamic(async () => await import("./dashboardLayout"), {
	ssr: false,
});

const Dashboard = () => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const { session, categorySlug } = useDashboardSession();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { isInNotFoundPage } = useIsInNotFoundPage();
	const { sortBy } = useGetSortBy();

	useDashboardRouteInvalidation({
		session: session ?? undefined,
		CATEGORY_ID,
		sortBy: sortBy ?? "",
	});

	const { allCategories, isLoadingCategories, isFetchingCategories } =
		useFetchCategories();
	const { userProfileData } = useFetchUserProfile();
	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();
	const { fileUploadOptimisticMutation } = useFileUploadOptimisticMutation();
	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();
	const { onDeleteCollection } = useDeleteCollection();

	const onDrop = useCallback(
		async (acceptedFiles: FileType[]) => {
			await fileUpload(
				acceptedFiles as unknown as FileList,
				fileUploadOptimisticMutation,
				CATEGORY_ID,
			);
		},
		[fileUploadOptimisticMutation, CATEGORY_ID],
	);

	useDashboardClipboardPaste({
		CATEGORY_ID,
		addBookmarkMinDataOptimisticMutation:
			addBookmarkMinDataOptimisticMutation as Parameters<
				typeof useDashboardClipboardPaste
			>[0]["addBookmarkMinDataOptimisticMutation"],
		fileUploadOptimisticMutation: fileUploadOptimisticMutation as Parameters<
			typeof useDashboardClipboardPaste
		>[0]["fileUploadOptimisticMutation"],
	});

	useDashboardProfileSync({
		userProfileData,
		session: session ?? undefined,
	});

	const setBookmarksView = useBookmarksViewApiLogic({
		scrollContainerRef,
		categorySlug,
	});

	const addBookmarkLogic = async (url: string) => {
		const currentCategory = find(
			allCategories?.data,
			(item) => item?.id === CATEGORY_ID,
		) as unknown as CategoriesData | undefined;

		const updateAccessCondition =
			typeof CATEGORY_ID === "number"
				? find(
						currentCategory?.collabData,
						(item) => item?.userEmail === session?.user?.email,
					)?.edit_access === true ||
					currentCategory?.user_id?.id === session?.user?.id
				: true;

		await mutationApiCall(
			addBookmarkMinDataOptimisticMutation.mutateAsync({
				url,
				category_id: CATEGORY_ID,
				update_access: updateAccessCondition,
			}),
		);
	};

	const onAddBookmark = (url: string) => {
		const hasProtocol =
			url?.startsWith("http://") || url?.startsWith("https://");
		const finalUrl = hasProtocol ? url : `https://${url}`;
		void addBookmarkLogic(finalUrl);
	};

	const handleUnsupported = () => {
		errorToast("This action is not available on Discover.");
	};

	const isDiscoverPage = categorySlug === DISCOVER_URL;

	if (isNil(session) && !isDiscoverPage) {
		return <div />;
	}

	return (
		<>
			<DashboardLayout
				categoryId={isDiscoverPage ? DISCOVER_URL : CATEGORY_ID}
				onAddBookmark={isDiscoverPage ? handleUnsupported : onAddBookmark}
				onClearTrash={() => {
					void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
				}}
				isClearingTrash={isClearingTrash}
				onDeleteCollectionClick={async () =>
					await onDeleteCollection(true, CATEGORY_ID as number)
				}
				setBookmarksView={setBookmarksView}
				uploadFileFromAddDropdown={isDiscoverPage ? handleUnsupported : onDrop}
				userId={session?.user?.id ?? ""}
			>
				<DashboardMainPane
					categorySlug={categorySlug}
					isInNotFoundPage={isInNotFoundPage}
					isLoadingCategories={isLoadingCategories}
					isFetchingCategories={isFetchingCategories}
					bookmarksPane={
						<DashboardBookmarksPane scrollContainerRef={scrollContainerRef} />
					}
				/>
			</DashboardLayout>

			<SettingsModal />

			<ToastContainer />
		</>
	);
};

export default Dashboard;
