import { useSession } from "@supabase/auth-helpers-react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNull } from "lodash";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import pick from "lodash/pick";
import React, { useState, type Key, type ReactNode } from "react";
import {
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

import useUpdateCategoryOrderMutation from "../../../async/mutationHooks/category/useUpdateCategoryOrderMutation";
import {
  AriaDropdown,
  AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import AddCategoryIcon from "../../../icons/addCategoryIcon";
import FileIcon from "../../../icons/categoryIcons/fileIcon";
import OptionsIconGray from "../../../icons/optionsIconGray";
import {
  useLoadersStore,
  useMiscellaneousStore,
} from "../../../store/componentStore";
import type {
  BookmarksCountTypes,
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from "../../../types/apiTypes";
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

interface CollectionsListPropTypes {
  onBookmarksDrop: (e: any) => Promise<void>;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number,
  ) => Promise<void>;
  onIconSelect: (value: string, id: number) => void;
  onAddNewCategory: (value: string) => Promise<void>;
}
// interface OnReorderPayloadTypes {
//   target: { key: string };
//   keys: Set<unknown>;
// }
interface ListBoxDropTypes extends ListProps<object> {
  getItems?: (keys: Set<Key>) => DragItem[];
  onReorder: (e: DroppableCollectionReorderEvent) => unknown;
  onItemDrop?: (e: any) => void;
}

const ListBoxDrop = (props: ListBoxDropTypes) => {
  const { getItems } = props;
  // Setup listbox as normal. See the useListBox docs for more details.
  const state = useListState(props);
  const ref = React.useRef(null);
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
    // Provide data for each dragged item. This function could
    // also be provided by the user of the component.
    getItems:
      getItems ||
      (keys => {
        return [...keys].map(key => {
          const item = state.collection.getItem(key);

          return {
            "text/plain": item.textValue,
          };
        });
      }),
  });

  useDraggableCollection(props, dragState, ref);

  // Merge listbox props and dnd props, and render the items as normal.
  return (
    <ul {...mergeProps(listBoxProps, collectionProps)} ref={ref}>
      {[...state.collection].map(item => (
        <OptionDrop
          key={item.key}
          item={item}
          state={state}
          dropState={dropState}
          dragState={dragState}
        />
      ))}
    </ul>
  );
};

interface DropIndicatorTypes extends DropIndicatorProps {
  dropState: DroppableCollectionState;
}

const DropIndicator = (props: DropIndicatorTypes) => {
  const { dropState } = props;
  const ref = React.useRef(null);
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
      role="option"
      aria-selected
      ref={ref}
      className={`drop-indicator ${isDropTarget ? "drop-target" : ""} z-10`}
    />
  );
};

interface OptionDropItemTypes extends DraggableItemProps {
  rendered: ReactNode;
}

const OptionDrop = ({
  item,
  state,
  dropState,
  dragState,
}: {
  item: OptionDropItemTypes;
  state: ListState<unknown>;
  dropState: DroppableCollectionState;
  dragState: DraggableCollectionState;
}) => {
  // Register the item as a drag source.
  const { dragProps } = useDraggableItem(
    {
      key: item.key,
    },
    dragState,
  );

  // Setup listbox option as normal. See useListBox docs for details.
  const ref = React.useRef(null);
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
    storeState => storeState.isCardDragging,
  );

  // Merge option props and dnd props, and render the item.
  return (
    <>
      <DropIndicator
        target={{ type: "item", key: item.key, dropPosition: "before" }}
        dropState={dropState}
      />
      <li
        {...mergeProps(
          pick(optionProps, ["id", "data-key"]),
          dropProps,
          focusProps,
          dragProps,
        )}
        ref={ref}
        // Apply a class when the item is the active drop target.
        // eslint-disable-next-line tailwindcss/no-custom-classname
        className={`option-drop ${isFocusVisible ? "focus-visible" : ""} ${
          isDropTarget && isCardDragging ? "drop-target" : ""
        }`}
      >
        {item.rendered}
      </li>

      {state.collection.getKeyAfter(item.key) == null && (
        <DropIndicator
          target={{ type: "item", key: item.key, dropPosition: "after" }}
          dropState={dropState}
        />
      )}
    </>
  );
};

const CollectionsList = (listProps: CollectionsListPropTypes) => {
  const {
    onBookmarksDrop,
    onCategoryOptionClick,
    onIconSelect,
    onAddNewCategory,
  } = listProps;

  const queryClient = useQueryClient();
  const session = useSession();
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const { updateCategoryOrderMutation } = useUpdateCategoryOrderMutation();

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
    state => state.sidePaneOptionLoading,
  );

  const collectionsList = session
    ? categoryData?.data?.map(item => {
        return {
          name: item?.category_name,
          href: `/${item?.category_slug}`,
          id: item?.id,
          current: currentPath === item?.category_slug,
          isPublic: item?.is_public,
          isCollab: !isEmpty(
            find(
              sharedCategoriesData?.data,
              cat => cat?.category_id === item?.id,
            ),
          ),
          iconValue: item?.icon,
          count: find(
            bookmarksCountData?.data?.categoryCount,
            catItem => catItem?.category_id === item?.id,
          )?.count,
        };
      })
    : [];

  const sortedList = () => {
    let arr: CollectionItemTypes[] = [];
    if (!isEmpty(userProfileData?.data)) {
      const apiCategoryOrder = userProfileData?.data[0]?.category_order;

      if (!isNull(apiCategoryOrder)) {
        apiCategoryOrder?.forEach(item => {
          const data = find(collectionsList, dataItem => dataItem?.id === item);

          if (data) {
            arr = [...arr, data];
          }
        });

        let categoriesNotThereInApiCategoryOrder: CollectionItemTypes[] = [];

        collectionsList?.forEach(item => {
          const data = find(
            apiCategoryOrder,
            dataItem => dataItem === item?.id,
          );

          if (!data) {
            categoriesNotThereInApiCategoryOrder = [
              ...categoriesNotThereInApiCategoryOrder,
              item,
            ];
          }
        });

        return [...arr, ...categoriesNotThereInApiCategoryOrder];
      }
      return collectionsList;
    }

    return [];
  };

  const onReorder = (e: DroppableCollectionReorderEvent) => {
    const apiOrder = userProfileData?.data[0]?.category_order;
    const listOrder = isNull(apiOrder)
      ? collectionsList?.map(item => item?.id)
      : userProfileData?.data[0]?.category_order;

    const index1 = listOrder?.indexOf(parseInt(e?.target?.key as string, 10)); // to index
    const index2 = listOrder?.indexOf(
      parseInt(e?.keys?.values().next().value as string, 10),
    ); // from index

    let myArray = listOrder;

    if (myArray && index1 !== undefined && index2 !== undefined && listOrder) {
      const movingItem = listOrder[index2];

      // remove
      myArray = myArray.filter(item => item !== movingItem);

      // add
      myArray.splice(index1, 0, movingItem);

      mutationApiCall(
        updateCategoryOrderMutation?.mutateAsync({ order: myArray, session }),
      )?.catch(() => {});
    }
  };

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-1 py-[7.5px]">
        <p className="text-[13px] font-medium  leading-[15px] text-custom-gray-10">
          Collections
        </p>
        <AriaDropdown
          menuButton={
            <div>
              <OptionsIconGray />
            </div>
          }
          menuClassName={`${dropdownMenuClassName} z-10`}
          menuButtonClassName="pr-1"
        >
          {[{ label: "Add Category", value: "add-category" }]?.map(item => (
            <AriaDropdownMenu
              key={item?.value}
              onClick={() => {
                if (item?.value === "add-category") {
                  setShowAddCategoryInput(true);
                }
              }}
            >
              <div className={dropdownMenuItemClassName}>{item?.label}</div>
            </AriaDropdownMenu>
          ))}
        </AriaDropdown>
      </div>
      <div>
        <div id="collections-wrapper">
          <ListBoxDrop
            aria-label="Categories-drop"
            selectionMode="multiple"
            selectionBehavior="replace"
            // items={list.items}
            onReorder={onReorder}
            onItemDrop={(e: any) => {
              onBookmarksDrop(e)?.catch(() => {});
            }}
          >
            {sortedList()?.map(item => (
              <Item textValue={item?.name} key={item?.id}>
                <SingleListItemComponent
                  extendedClassname="pb-[6px] pt-[4px] mt-[2px]"
                  item={item}
                  showDropdown
                  listNameId="collection-name"
                  onCategoryOptionClick={onCategoryOptionClick}
                  onIconSelect={onIconSelect}
                  showSpinner={item?.id === sidePaneOptionLoading}
                />
              </Item>
            ))}
          </ListBoxDrop>
        </div>
        {showAddCategoryInput && (
          <div className="mt-1 flex cursor-pointer items-center justify-between rounded-lg bg-custom-gray-2 px-2 py-[5px]">
            <div className="flex items-center">
              <figure className="mr-2 h-[18px] w-[18px]">
                <FileIcon />
              </figure>
              <input
                placeholder="Category Name"
                id="add-category-input"
                className="bg-black/[0.004] text-sm font-[450] leading-4 text-custom-gray-1 opacity-40 focus:outline-none"
                // disabling it as we do need it here
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onBlur={() => setShowAddCategoryInput(false)}
                onKeyUp={e => {
                  if (
                    e.key === "Enter" &&
                    !isEmpty((e.target as HTMLInputElement).value)
                  ) {
                    onAddNewCategory(
                      (e.target as HTMLInputElement).value,
                    )?.catch(() => {});
                    setShowAddCategoryInput(false);
                  }
                }}
              />
            </div>
          </div>
        )}
        <div
          role="button"
          tabIndex={0}
          className="mt-1 flex cursor-pointer items-center rounded-lg py-[5px] px-2 hover:bg-custom-gray-2"
          onClick={() => setShowAddCategoryInput(true)}
          onKeyDown={() => {}}
          id="add-category-button"
        >
          <figure>
            <AddCategoryIcon />
          </figure>
          <p className="ml-2 flex-1 truncate text-sm font-450 leading-[16px] text-custom-gray-3">
            Add Category
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollectionsList;
