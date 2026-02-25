import { useMemo, useRef, useState, type Key, type ReactNode } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import {
	DragPreview,
	ListDropTargetDelegate,
	ListKeyboardDelegate,
	mergeProps,
	useDraggableCollection,
	useDraggableItem,
	useDropIndicator,
	useDroppableCollection,
	useDroppableItem,
	useFocusRing,
	useListBox,
	useOption,
	type DraggableItemProps,
	type DragItem,
	type DropIndicatorProps,
	type DroppableCollectionReorderEvent,
} from "react-aria";
import {
	Item,
	useDraggableCollectionState,
	useDroppableCollectionState,
	useListState,
	type DraggableCollectionState,
	type DroppableCollectionState,
	type ListProps,
	type ListState,
} from "react-stately";

import useUpdateCategoryOrderOptimisticMutation from "../../../async/mutationHooks/category/useUpdateCategoryOrderOptimisticMutation";
import useFetchPaginatedBookmarks from "../../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../../async/queryHooks/bookmarks/useSearchBookmarks";
import useFetchCategories from "../../../async/queryHooks/category/useFetchCategories";
import useFetchUserProfile from "../../../async/queryHooks/user/useFetchUserProfile";
import AriaDisclosure from "../../../components/ariaDisclosure";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import { Dialog } from "@/components/ui/recollect/dialog";
import { useDeleteCollection } from "../../../hooks/useDeleteCollection";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import AddCategoryIcon from "../../../icons/addCategoryIcon";
import DownArrowGray from "../../../icons/downArrowGray";
import OptionsIcon from "../../../icons/optionsIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksCountTypes,
	type CategoriesData,
	type FetchSharedCategoriesData,
} from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	MAX_TAG_COLLECTION_NAME_LENGTH,
	MIN_TAG_COLLECTION_NAME_LENGTH,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { errorToast } from "../../../utils/toastMessages";

import { CollectionsListSkeleton } from "./collectionLIstSkeleton";
import SingleListItemComponent, {
	type CollectionItemTypes,
} from "./singleListItemComponent";
import { useAddCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-optimistic-mutation";
import { useAddCategoryToBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmark-optimistic-mutation";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { handleClientError } from "@/utils/error-utils/client";

type ListBoxDropTypes = ListProps<object> & {
	getItems?: (keys: Set<Key>) => DragItem[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onItemDrop?: (event: any) => void;
	onReorder: (event: DroppableCollectionReorderEvent) => unknown;
};

const RenderDragPreview = ({ collectionName }: { collectionName: string }) => {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const userId = session?.user?.id;

	const singleCategoryData = find(
		categoryData?.data,
		(item) => item.category_name === collectionName,
	);

	const isUserCollectionOwner = singleCategoryData?.user_id?.id === userId;

	if (isUserCollectionOwner) {
		return <div className="text-gray-1000">{collectionName}</div>;
	}

	return (
		<div className="text-gray-1000">Non Owner collection cannot be sorted</div>
	);
};

const ListBoxDrop = (props: ListBoxDropTypes) => {
	const { getItems } = props;
	// Setup listbox as normal. See the useListBox docs for more details.
	const state = useListState(props);
	const ref = useRef(null);
	const preview = useRef(null);
	const { listBoxProps } = useListBox(
		{ ...props, shouldSelectOnPressUp: true },
		state,
		ref,
	);

	// Setup react-stately and react-aria hooks for drag and drop.
	const dropState = useDroppableCollectionState({
		...props,
		// Collection and selection manager come from list state.
		collection: state.collection,
		selectionManager: state.selectionManager,
	});

	const { collectionProps } = useDroppableCollection(
		{
			...props,
			// Provide drop targets for keyboard and pointer-based drag and drop.
			keyboardDelegate: new ListKeyboardDelegate(
				state.collection,
				state.disabledKeys,
				ref,
			),
			dropTargetDelegate: new ListDropTargetDelegate(state.collection, ref),
		},
		dropState,
		ref,
	);

	// Setup drag state for the collection.
	const dragState = useDraggableCollectionState({
		...props,
		// Collection and selection manager come from list state.
		collection: state.collection,
		selectionManager: state.selectionManager,
		preview,
		// Provide data for each dragged item. This function could
		// also be provided by the user of the component.
		getItems:
			getItems ??
			((keys) =>
				[...keys].map((key) => {
					const item = state.collection.getItem(key);

					return {
						"text/plain": !isNull(item) ? item.textValue : "",
					};
				})),
	});

	useDraggableCollection(props, dragState, ref);

	// Merge listbox props and dnd props, and render the items as normal.
	return (
		<ul
			{...mergeProps(listBoxProps, collectionProps)}
			className="flex flex-col gap-px"
			ref={ref}
		>
			{[...state.collection].map((item) => (
				<OptionDrop
					dragState={dragState}
					dropState={dropState}
					item={item}
					key={item.key}
					state={state}
				/>
			))}
			<DragPreview ref={preview}>
				{(items) => (
					<RenderDragPreview collectionName={items[0]["text/plain"]} />
				)}
			</DragPreview>
		</ul>
	);
};

type DropIndicatorTypes = DropIndicatorProps & {
	dropState: DroppableCollectionState;
};

const DropIndicator = (props: DropIndicatorTypes) => {
	const { dropState } = props;
	const ref = useRef(null);
	const { dropIndicatorProps, isHidden, isDropTarget } = useDropIndicator(
		props,
		dropState,
		ref,
	);
	if (isHidden) {
		return null;
	}

	return (
		<li
			{...dropIndicatorProps}
			aria-selected
			className={`drop-indicator ${isDropTarget ? "drop-target" : ""} z-10`}
			ref={ref}
			role="option"
		/>
	);
};

type OptionDropItemTypes = DraggableItemProps & {
	rendered: ReactNode;
};

const OptionDrop = ({
	item,
	state,
	dropState,
	dragState,
}: {
	dragState: DraggableCollectionState;
	dropState: DroppableCollectionState;
	item: OptionDropItemTypes;
	state: ListState<unknown>;
}) => {
	// Register the item as a drag source.
	const { dragProps } = useDraggableItem(
		{
			key: item.key,
		},
		dragState,
	);

	// Setup listbox option as normal. See useListBox docs for details.
	const ref = useRef(null);
	const { optionProps } = useOption({ key: item.key }, state, ref);
	const { isFocusVisible, focusProps } = useFocusRing();

	// Register the item as a drop target.
	const { dropProps, isDropTarget } = useDroppableItem(
		{
			target: { type: "item", key: item.key, dropPosition: "on" },
		},
		dropState,
		ref,
	);

	const isCardDragging = useMiscellaneousStore(
		(storeState) => storeState.isCardDragging,
	);

	// Merge option props and dnd props, and render the item.
	return (
		<>
			<DropIndicator
				dropState={dropState}
				target={{ type: "item", key: item.key, dropPosition: "before" }}
			/>
			<li
				{...mergeProps(optionProps, dropProps, focusProps, dragProps)}
				// Apply a class when the item is the active drop target.
				className={`option-drop ${isFocusVisible ? "focus-visible" : ""} ${
					isDropTarget && isCardDragging ? "drop-target" : ""
				}`}
				ref={ref}
			>
				{item.rendered}
			</li>
			{state.collection.getKeyAfter(item.key) === null && (
				<DropIndicator
					dropState={dropState}
					target={{ type: "item", key: item.key, dropPosition: "after" }}
				/>
			)}
		</>
	);
};

const CollectionsList = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
	const [isCollectionHeaderMenuOpen, setIsCollectionHeaderMenuOpen] =
		useState(false);
	const { isDesktop } = useIsMobileView();
	const [deleteConfirmation, setDeleteConfirmation] = useState<{
		isOpen: boolean;
		categoryId: number | null;
		isCurrent: boolean;
	}>({ isOpen: false, categoryId: null, isCurrent: false });

	const { addCategoryOptimisticMutation } = useAddCategoryOptimisticMutation();
	const { addCategoryToBookmarkOptimisticMutation } =
		useAddCategoryToBookmarkOptimisticMutation();
	const { updateCategoryOrderMutation } =
		useUpdateCategoryOrderOptimisticMutation();
	const { allCategories, isLoadingCategories } = useFetchCategories();
	const { userProfileData } = useFetchUserProfile();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { onDeleteCollection } = useDeleteCollection();
	const { everythingData, isEverythingDataLoading } =
		useFetchPaginatedBookmarks();
	const { flattenedSearchData } = useSearchBookmarks();

	const flattendPaginationBookmarkData = useMemo(
		() => everythingData?.pages?.flatMap((page) => page?.data ?? []) ?? [],
		[everythingData?.pages],
	);

	const mergedBookmarkData = useMemo(
		() => [...flattendPaginationBookmarkData, ...(flattenedSearchData ?? [])],
		[flattendPaginationBookmarkData, flattenedSearchData],
	);

	const handleCategoryOptionClick = (
		value: number | string,
		current: boolean,
		id: number,
	) => {
		switch (value) {
			case "delete":
				setDeleteConfirmation({
					isOpen: true,
					categoryId: id,
					isCurrent: current,
				});
				break;

			case "share":
				// code block
				break;

			default:
			// code block
		}
	};

	const handleConfirmDelete = async () => {
		if (deleteConfirmation.categoryId !== null) {
			try {
				await onDeleteCollection(
					deleteConfirmation.isCurrent,
					deleteConfirmation.categoryId,
				);
				setDeleteConfirmation({
					isOpen: false,
					categoryId: null,
					isCurrent: false,
				});
			} catch {
				// Modal stays open on error; mutation hook handles error toast
			}

			return;
		}

		setDeleteConfirmation({
			isOpen: false,
			categoryId: null,
			isCurrent: false,
		});
	};

	const handleCancelDelete = () => {
		setDeleteConfirmation({
			isOpen: false,
			categoryId: null,
			isCurrent: false,
		});
	};

	const currentPath = useGetCurrentUrlPath();

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		session?.user?.id,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const handleAddNewCategory = async (newCategoryName: string) => {
		const result = tagCategoryNameSchema.safeParse(newCategoryName);

		if (!result.success) {
			handleClientError(
				new Error(result.error.issues[0]?.message ?? "Invalid collection name"),
				`Collection name must be between ${MIN_TAG_COLLECTION_NAME_LENGTH} and ${MAX_TAG_COLLECTION_NAME_LENGTH} characters`,
			);
			return;
		}

		if (userProfileData && !isNull(userProfileData.data)) {
			addCategoryOptimisticMutation.mutate(
				{
					name: result.data,
					category_order: (
						userProfileData.data[0]?.category_order ?? []
					).filter((id): id is number => id !== null),
				},
				{
					onSuccess: (data) => {
						void router.push(`/${data[0].category_slug}`);
					},
				},
			);
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleBookmarksDrop = async (event: any) => {
		// Guard: don't process drops while bookmarks are still loading
		if (isEverythingDataLoading || !everythingData) {
			return;
		}

		if (event?.isInternal === false) {
			const categoryId = Number.parseInt(event?.target?.key as string, 10);

			const currentCategory =
				find(allCategories?.data, (item) => item?.id === categoryId) ??
				find(allCategories?.data, (item) => item?.id === CATEGORY_ID);
			// only if the user has write access or is owner to this category, then this mutation should happen , or if bookmark is added to uncategorised

			const updateAccessCondition =
				find(
					currentCategory?.collabData,
					(item) => item?.userEmail === session?.user?.email,
				)?.edit_access === true ||
				currentCategory?.user_id?.id === session?.user?.id;

			// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-explicit-any
			await event?.items?.forEach(async (item: any) => {
				const bookmarkId = (await item.getText("text/plain")) as string;

				const foundBookmark = find(
					mergedBookmarkData,
					(bookmarkItem) =>
						Number.parseInt(bookmarkId, 10) === bookmarkItem?.id,
				);

				// Ignore drops that aren't bookmarks (e.g., collections dragged between sidebar lists)
				if (!foundBookmark) {
					return;
				}

				// Handle both nested object (from regular fetch) and plain string (from search)
				const bookmarkCreatedUserId =
					foundBookmark?.user_id?.id ?? foundBookmark?.user_id;
				if (bookmarkCreatedUserId === session?.user?.id) {
					if (!updateAccessCondition) {
						// if update access is not there then user cannot drag and drop anything into the collection
						errorToast("Cannot upload in other owners collection");
						return;
					}

					addCategoryToBookmarkOptimisticMutation.mutate({
						category_id: categoryId,
						bookmark_id: Number.parseInt(bookmarkId, 10),
					});
				} else {
					errorToast("You cannot move collaborators uploads");
				}
			});
		}
	};

	const collectionsList = session
		? categoryData?.data?.map((item) => ({
				name: item?.category_name,
				href: `/${item?.category_slug}`,
				id: item?.id,
				current: currentPath === item?.category_slug,
				isFavorite: item?.is_favorite,
				isPublic: item?.is_public,
				isCollab: !isEmpty(
					find(
						sharedCategoriesData?.data,
						(cat) => cat?.category_id === item?.id,
					),
				),
				iconValue: item?.icon,
				count: find(
					bookmarksCountData?.data?.categoryCount,
					(catItem) => catItem?.category_id === item?.id,
				)?.count,
				iconColor: item?.icon_color,
			}))
		: [];
	const sortedList = () => {
		let array: CollectionItemTypes[] = [];
		if (!isEmpty(userProfileData?.data)) {
			const apiCategoryOrder = userProfileData?.data?.[0].category_order;

			if (!isNull(apiCategoryOrder)) {
				if (apiCategoryOrder) {
					for (const item of apiCategoryOrder) {
						const data = find(
							collectionsList,
							(dataItem) => dataItem?.id === item,
						);

						if (data) {
							array = [...array, data];
						}
					}
				}

				let categoriesNotThereInApiCategoryOrder: CollectionItemTypes[] = [];

				if (collectionsList) {
					for (const item of collectionsList) {
						const data = find(
							apiCategoryOrder,
							(dataItem) => dataItem === item?.id,
						);

						if (!data) {
							categoriesNotThereInApiCategoryOrder = [
								...categoriesNotThereInApiCategoryOrder,
								item,
							];
						}
					}
				}

				return [...array, ...categoriesNotThereInApiCategoryOrder];
			}

			return collectionsList;
		}

		return collectionsList;
	};

	const allSorted = sortedList() ?? [];
	const favoriteCollections = allSorted.filter((item) => item.isFavorite);
	const nonFavoriteCollections = allSorted;

	const bookmarkCount =
		bookmarksCountData?.data?.categoryCount?.find(
			(item) => item?.category_id === deleteConfirmation.categoryId,
		)?.count ?? 0;

	const onReorder = (event: DroppableCollectionReorderEvent) => {
		const apiOrder = userProfileData?.data?.[0].category_order;

		const listOrder = isNull(apiOrder)
			? collectionsList?.map((item) => item?.id)
			: userProfileData?.data?.[0].category_order;

		// to index
		const index1 = listOrder?.indexOf(
			Number.parseInt(event?.target?.key as string, 10),
		);
		// from index
		const index2 = listOrder?.indexOf(
			Number.parseInt(event?.keys?.values().next().value as string, 10),
		);

		let myArray = listOrder;

		if (myArray && index1 !== undefined && index2 !== undefined && listOrder) {
			const movingItem = listOrder[index2];

			// remove
			myArray = myArray.filter((item) => item !== movingItem);

			// add
			myArray.splice(index1, 0, movingItem);
			void mutationApiCall(
				updateCategoryOrderMutation?.mutateAsync({
					order: myArray,
				}),
			);
		}
	};

	const renderAddCategoryInput = showAddCategoryInput ? (
		<div className="mt-1 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 px-2 py-[6px]">
			<div className="flex items-center">
				<figure className="mr-2 h-[18px] w-[18px]">
					<svg
						fill="var(--color-plain-reverse)"
						height="16"
						viewBox="0 0 18 18"
						width="16"
					>
						<use href="/sprite.svg#star-04" />
					</svg>
				</figure>
				<input
					autoFocus
					className="bg-black/[0.004]! text-sm! leading-4! font-450! text-plain-reverse! opacity-40! placeholder:text-plain-reverse focus:ring-0! focus:ring-offset-0! focus:outline-hidden!"
					id="add-category-input"
					onBlur={(event) => {
						const inputValue = (event.target as HTMLInputElement)?.value;
						if (inputValue) {
							void handleAddNewCategory(inputValue);
						}

						setShowAddCategoryInput(false);
					}}
					onKeyUp={(event) => {
						if (event.key === "Enter") {
							const inputValue = (event.target as HTMLInputElement)?.value;

							if (inputValue) {
								void handleAddNewCategory(inputValue);
							}

							setShowAddCategoryInput(false);
						}
					}}
					placeholder="Collection Name"
				/>
			</div>
		</div>
	) : (
		// we have ths as null | undefined is not accepted as AriaDisclosure children
		<span className="hidden" />
	);

	const favoritesHeader = (
		<div className="group flex w-full items-center justify-between px-1 py-[7px]">
			<div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
				<p className="mr-1">Favorites</p>
				<DownArrowGray
					className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
					size={10}
				/>
			</div>
		</div>
	);

	const collectionsHeader = (
		<div className="group flex w-full items-center justify-between px-1 py-[7px]">
			<div className="flex items-center text-13 leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
				<p className="mr-1">Collections</p>
				<DownArrowGray
					className="collections-sidepane-down-arrow hidden pt-px text-gray-500 group-hover:block"
					size={10}
				/>
			</div>
			<AriaDropdown
				menuButton={
					<div
						className={
							isCollectionHeaderMenuOpen
								? "block text-gray-500"
								: "hidden text-gray-500 group-hover:block"
						}
					>
						<OptionsIcon />
					</div>
				}
				menuButtonClassName="h-4 w-4"
				menuClassName={`${dropdownMenuClassName} z-10`}
				menuOpenToggle={(value) => {
					setIsCollectionHeaderMenuOpen(value);
				}}
				onButtonClick={(event) => event?.stopPropagation()}
				portalElement={
					!isDesktop
						? () => {
								if (typeof document === "undefined") {
									return null;
								}

								return document.querySelector("#side-pane-dropdown-portal");
							}
						: undefined
				}
			>
				{[{ label: "Add Collection", value: "add-category" }]?.map((item) => (
					<AriaDropdownMenu
						key={item?.value}
						onClick={() => {
							if (item?.value === "add-category") {
								setShowAddCategoryInput(true);
							}
						}}
					>
						<div className={`text-justify ${dropdownMenuItemClassName}`}>
							{item?.label}
						</div>
					</AriaDropdownMenu>
				))}
			</AriaDropdown>
		</div>
	);
	return (
		<>
			{favoriteCollections.length > 0 && (
				<div className="py-4">
					<AriaDisclosure renderDisclosureButton={favoritesHeader}>
						<ul className="flex flex-col gap-px" id="favorites-wrapper">
							{favoriteCollections.map((item) => (
								<li key={item?.id}>
									<SingleListItemComponent
										extendedClassname="py-[6px]"
										item={item}
										listNameId="favorite-collection-name"
										onCategoryOptionClick={handleCategoryOptionClick}
										showDropdown
										showSpinner={
											addCategoryToBookmarkOptimisticMutation.isPending &&
											addCategoryToBookmarkOptimisticMutation.variables
												?.category_id === item?.id
										}
									/>
								</li>
							))}
						</ul>
					</AriaDisclosure>
				</div>
			)}

			<AriaDisclosure renderDisclosureButton={collectionsHeader}>
				<div id="collections-wrapper">
					{isLoadingCategories ? (
						<CollectionsListSkeleton />
					) : (
						<ListBoxDrop
							aria-label="Categories-drop"
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onItemDrop={(event: any) => {
								void handleBookmarksDrop(event);
							}}
							onReorder={onReorder}
							selectionBehavior="replace"
							selectionMode="multiple"
						>
							{nonFavoriteCollections?.map((item) => (
								<Item key={item?.id} textValue={item?.name}>
									<SingleListItemComponent
										extendedClassname="py-[6px]"
										item={item}
										listNameId="collection-name"
										onCategoryOptionClick={handleCategoryOptionClick}
										showDropdown
										showSpinner={
											addCategoryToBookmarkOptimisticMutation.isPending &&
											addCategoryToBookmarkOptimisticMutation.variables
												?.category_id === item?.id
										}
									/>
								</Item>
							))}
						</ListBoxDrop>
					)}
				</div>
				{renderAddCategoryInput}
				<div
					className="mt-1 flex cursor-pointer items-center rounded-lg px-2 py-[6px] hover:bg-gray-100"
					id="add-category-button"
					onClick={() => setShowAddCategoryInput(true)}
					onKeyDown={() => {}}
					role="button"
					tabIndex={0}
				>
					<figure className="text-gray-500">
						<AddCategoryIcon />
					</figure>
					<p className="ml-2 flex-1 truncate text-sm leading-[16px] font-450 text-gray-600">
						Add Collection
					</p>
				</div>
			</AriaDisclosure>

			{/* Delete Collection Confirmation Modal */}
			<Dialog.Root
				open={deleteConfirmation.isOpen}
				onOpenChange={(open) => {
					if (!open) {
						handleCancelDelete();
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup className="max-w-md min-w-[448px] rounded-xl p-6">
						<Dialog.Title className="text-gray-900">
							Delete Collection
						</Dialog.Title>
						{bookmarkCount > 0 && (
							<Dialog.Description className="mt-2">
								You have {bookmarkCount} bookmarks in this collection.
							</Dialog.Description>
						)}
						<div className="mt-4 flex justify-end gap-3">
							<button
								className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
								onClick={handleCancelDelete}
								type="button"
							>
								Cancel
							</button>
							<button
								className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
								onClick={handleConfirmDelete}
								type="button"
							>
								Delete
							</button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
};

export default CollectionsList;
