import React, { useState } from 'react';
import {
  Item,
  useDroppableCollectionState,
  useListState,
  useDraggableCollectionState,
  useListData,
} from 'react-stately';
import {
  mergeProps,
  useFocusRing,
  useListBox,
  useOption,
  ListDropTargetDelegate,
  ListKeyboardDelegate,
  useDroppableCollection,
  useDroppableItem,
  useDraggableCollection,
  useDraggableItem,
  useDropIndicator,
} from 'react-aria';
import { useSession } from '@supabase/auth-helpers-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookmarksCountTypes,
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from '../../../types/apiTypes';
import { PostgrestError } from '@supabase/supabase-js';
import {
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  USER_PROFILE,
} from '../../../utils/constants';
import SingleListItemComponent from './singleListItemComponent';
import { useRouter } from 'next/router';
import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import FileIcon from '../../../icons/categoryIcons/fileIcon';
import AddCategoryIcon from '../../../icons/addCategoryIcon';
import { useLoadersStore } from '../../../store/componentStore';
import pick from 'lodash/pick';
import useUpdateCategoryOrderMutation from '../../../async/mutationHooks/category/useUpdateCategoryOrderMutation';
import { updateCategoryOrder } from '../../../async/supabaseCrudHelpers';
import { mutationApiCall } from '../../../utils/apiHelpers';
import { isNull } from 'lodash';

interface CollectionsListPropTypes {
  onBookmarksDrop: (e: any) => void;
  onCategoryOptionClick: (
    value: string | number,
    current: boolean,
    id: number
  ) => void;
  onIconSelect: (value: string, id: number) => void;
  onAddNewCategory: (value: string) => void;
}

//TODO: fix all ts-ignore and all any types

const CollectionsList = (listProps: CollectionsListPropTypes) => {
  const {
    onBookmarksDrop,
    onCategoryOptionClick,
    onIconSelect,
    onAddNewCategory,
  } = listProps;

  const queryClient = useQueryClient();
  const session = useSession();
  const router = useRouter();
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const { updateCategoryOrderMutation } = useUpdateCategoryOrderMutation();

  const currentPath = router.asPath.split('/')[1] || null;

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
    (state) => state.sidePaneOptionLoading
  );

  function ListBoxDrop(props: any) {
    // Setup listbox as normal. See the useListBox docs for more details.
    const state = useListState(props);
    const ref = React.useRef(null);
    const { listBoxProps } = useListBox(
      { ...props, shouldSelectOnPressUp: true },
      state,
      ref
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
          ref
        ),
        dropTargetDelegate: new ListDropTargetDelegate(state.collection, ref),
      },
      dropState,
      ref
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
        props.getItems ||
        ((keys) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          return [...keys].map((key) => {
            const item = state.collection.getItem(key);

            return {
              'text/plain': item.textValue,
            };
          });
        }),
    });

    useDraggableCollection(props, dragState, ref);

    // Merge listbox props and dnd props, and render the items as normal.
    return (
      <ul {...mergeProps(listBoxProps, collectionProps)} ref={ref}>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        {[...state.collection].map((item) => (
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
  }

  function DropIndicator(props: any) {
    const ref = React.useRef(null);
    const { dropIndicatorProps, isHidden, isDropTarget } = useDropIndicator(
      props,
      props.dropState,
      ref
    );
    if (isHidden) {
      return null;
    }

    return (
      <li
        {...dropIndicatorProps}
        role="option"
        ref={ref}
        className={`drop-indicator ${isDropTarget ? 'drop-target' : ''}`}
      />
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  function OptionDrop({ item, state, dropState, dragState }) {
    // Register the item as a drag source.
    const { dragProps } = useDraggableItem(
      {
        key: item.key,
      },
      dragState
    );

    console.log('dd', dragProps, dragState);

    // Setup listbox option as normal. See useListBox docs for details.
    const ref = React.useRef(null);
    const { optionProps } = useOption({ key: item.key }, state, ref);
    const { isFocusVisible, focusProps } = useFocusRing();

    // Register the item as a drop target.
    const { dropProps, isDropTarget } = useDroppableItem(
      {
        target: { type: 'item', key: item.key, dropPosition: 'on' },
      },
      dropState,
      ref
    );

    // Merge option props and dnd props, and render the item.
    return (
      <>
        <DropIndicator
          target={{ type: 'item', key: item.key, dropPosition: 'before' }}
          dropState={dropState}
        />
        <li
          {...mergeProps(
            pick(optionProps, ['id', 'data-key']),
            // optionProps,
            dropProps,
            focusProps,
            dragProps
          )}
          ref={ref}
          // Apply a class when the item is the active drop target.
          className={`option-drop ${isFocusVisible ? 'focus-visible' : ''} ${
            isDropTarget ? 'drop-target' : ''
          }`}
        >
          {console.log('ii', item)}
          {item.rendered}
        </li>
        {state.collection.getKeyAfter(item.key) == null && (
          <DropIndicator
            target={{ type: 'item', key: item.key, dropPosition: 'after' }}
            dropState={dropState}
          />
        )}
      </>
    );
  }

  const collectionsList = session
    ? categoryData?.data?.map((item) => {
        return {
          name: item?.category_name,
          href: `/${item?.category_slug}`,
          id: item?.id,
          current: currentPath === item?.category_slug,
          isPublic: item?.is_public,
          isCollab: !isEmpty(
            find(
              sharedCategoriesData?.data,
              (cat) => cat?.category_id === item?.id
            )
          ),
          iconValue: item?.icon,
          count: find(
            bookmarksCountData?.data?.categoryCount,
            (catItem) => catItem?.category_id === item?.id
          )?.count,
        };
      })
    : [];

  const sortedList = () => {
    let arr: any[] = [];
    const apiCategoryOrder = userProfileData?.data[0]?.category_order;

    if (!isNull(apiCategoryOrder)) {
      apiCategoryOrder?.forEach((item) => {
        const data = find(collectionsList, (dataItem) => dataItem?.id === item);

        if (data) {
          arr = [...arr, data];
        }
      });

      return arr;
    } else {
      return collectionsList;
    }
  };

  const list = useListData({
    initialItems: [],
  });

  const onReorder = (e: any) => {
    const apiOrder = userProfileData?.data[0]?.category_order;
    const listOrder = isNull(apiOrder)
      ? collectionsList?.map((item) => item?.id)
      : userProfileData?.data[0]?.category_order;

    const index1 = listOrder?.indexOf(parseInt(e?.target?.key));
    const index2 = listOrder?.indexOf(parseInt(e?.keys?.values().next().value));

    const myArray = listOrder;

    if (myArray && index1 !== undefined && index2 !== undefined) {
      const temp = myArray[index1];
      myArray[index1] = myArray[index2];
      myArray[index2] = temp;

      mutationApiCall(
        updateCategoryOrderMutation?.mutateAsync({ order: myArray, session })
      );
    }
  };

  return (
    <div className="pt-[25px]">
      <p className="font-medium text-[13px] leading-[115%] px-1 text-custom-gray-3">
        Collections
      </p>
      <div className="pt-3">
        <div id="collections-wrapper">
          <ListBoxDrop
            aria-label="Categories-drop"
            selectionMode="multiple"
            selectionBehavior="replace"
            // items={list.items}
            onReorder={onReorder}
            onItemDrop={(e: any) => {
              onBookmarksDrop(e);
            }}
          >
            {sortedList()?.map((item) => (
              <Item textValue={item?.name} key={item?.id}>
                <SingleListItemComponent
                  extendedClassname="py-[5px]"
                  item={item}
                  showDropdown={true}
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
          <div
            className={`px-2 py-[5px] mt-1 flex items-center bg-custom-gray-2 rounded-lg cursor-pointer justify-between`}
          >
            <div className="flex items-center">
              <figure className="mr-2">
                <FileIcon />
              </figure>
              <input
                placeholder="Category Name"
                id="add-category-input"
                className="text-sm font-[450] text-custom-gray-5 leading-4 focus:outline-none bg-black/[0.004] opacity-40"
                autoFocus
                onBlur={() => setShowAddCategoryInput(false)}
                onKeyUp={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isEmpty((e.target as HTMLInputElement).value)
                  ) {
                    onAddNewCategory((e.target as HTMLInputElement).value);
                    setShowAddCategoryInput(false);
                  }
                }}
              />
            </div>
          </div>
        )}
        <div
          className="py-[5px] px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer"
          onClick={() => setShowAddCategoryInput(true)}
          id="add-category-button"
        >
          <figure>
            <AddCategoryIcon />
          </figure>
          <p className="truncate ml-2 flex-1 text-sm font-medium text-custom-gray-3 leading-[16px]">
            Add Category
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollectionsList;
