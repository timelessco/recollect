import { useRef, useState, type Key, type ReactNode } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNull } from "lodash";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import pick from "lodash/pick";
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
import AriaDisclosure from "../../../components/ariaDisclosure";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import AddCategoryIcon from "../../../icons/addCategoryIcon";
import DownArrowGray from "../../../icons/downArrowGray";
import OptionsIcon from "../../../icons/optionsIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksCountTypes,
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
} from "../../../types/apiTypes";
import { type CategoryIconsDropdownTypes } from "../../../types/componentTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
} from "../../../utils/constants";

import SingleListItemComponent, {
	type CollectionItemTypes,
} from "./singleListItemComponent";

type CollectionsListPropertyTypes = {
	onAddNewCategory: (value: string) => Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onBookmarksDrop: (event: any) => Promise<void>;
	onCategoryOptionClick: (
		value: number | string,
		current: boolean,
		id: number,
	) => Promise<void>;
	onIconColorChange?: CategoryIconsDropdownTypes["onIconColorChange"];
	onIconSelect: (value: string, id: number) => void;
};
// interface OnReorderPayloadTypes {
//   target: { key: string };
//   keys: Set<unknown>;
// }
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
		<ul {...mergeProps(listBoxProps, collectionProps)} ref={ref}>
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
				{...mergeProps(
					pick(optionProps, ["id", "data-key"]),
					dropProps,
					focusProps,
					dragProps,
				)}
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

const CollectionsList = (listProps: CollectionsListPropertyTypes) => {
	const {
		onBookmarksDrop,
		onCategoryOptionClick,
		onIconSelect,
		onAddNewCategory,
		onIconColorChange,
	} = listProps;

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
	const [isCollectionHeaderMenuOpen, setIsCollectionHeaderMenuOpen] =
		useState(false);

	const { updateCategoryOrderMutation } =
		useUpdateCategoryOrderOptimisticMutation();

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

	const userProfileData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const sidePaneOptionLoading = useLoadersStore(
		(state) => state.sidePaneOptionLoading,
	);

	const collectionsList = session
		? categoryData?.data?.map((item) => ({
				name: item?.category_name,
				href: `/${item?.category_slug}`,
				id: item?.id,
				current: currentPath === item?.category_slug,
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
			const apiCategoryOrder = userProfileData?.data[0]?.category_order;

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

		return [];
	};

	const onReorder = (event: DroppableCollectionReorderEvent) => {
		const apiOrder = userProfileData?.data[0]?.category_order;

		const listOrder = isNull(apiOrder)
			? collectionsList?.map((item) => item?.id)
			: userProfileData?.data[0]?.category_order;

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
						fill="var(--plain-reverse-color)"
						height="16"
						viewBox="0 0 18 18"
						width="16"
					>
						<use href="/sprite.svg#star-04" />
					</svg>
				</figure>
				<input
					autoFocus
					className="text-plain-reverse-color! placeholder:text-plain-reverse-color font-450! bg-black/[0.004]! text-sm! leading-4! opacity-40! focus:ring-0! focus:ring-offset-0! focus:outline-hidden!"
					id="add-category-input"
					onBlur={(event) => {
						if (!isEmpty(event?.target?.value)) {
							void onAddNewCategory((event.target as HTMLInputElement).value);
						}

						setShowAddCategoryInput(false);
					}}
					onKeyUp={(event) => {
						if (
							event.key === "Enter" &&
							!isEmpty((event.target as HTMLInputElement).value)
						) {
							void onAddNewCategory((event.target as HTMLInputElement).value);
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

	const collectionsHeader = (
		<div className="group flex w-full items-center justify-between px-1 py-[7.5px]">
			<div className="text-13 flex items-center leading-[14.95px] font-medium tracking-[0.02em] text-gray-600">
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
		<div className="pt-4">
			<AriaDisclosure renderDisclosureButton={collectionsHeader}>
				<div id="collections-wrapper">
					<ListBoxDrop
						aria-label="Categories-drop"
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						onItemDrop={(event: any) => {
							void onBookmarksDrop(event);
						}}
						onReorder={onReorder}
						selectionBehavior="replace"
						selectionMode="multiple"
					>
						{sortedList()?.map((item) => (
							<Item key={item?.id} textValue={item?.name}>
								<SingleListItemComponent
									extendedClassname="py-[6px]"
									item={item}
									listNameId="collection-name"
									onCategoryOptionClick={onCategoryOptionClick}
									onIconColorChange={(color) =>
										onIconColorChange?.(color, item?.id)
									}
									onIconSelect={onIconSelect}
									showDropdown
									showSpinner={item?.id === sidePaneOptionLoading}
								/>
							</Item>
						))}
					</ListBoxDrop>
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
					<p className="font-450 ml-2 flex-1 truncate text-sm leading-[16px] text-gray-600">
						Add Collection
					</p>
				</div>
			</AriaDisclosure>
		</div>
	);
};

export default CollectionsList;
