import React, { useState } from 'react';
import { Item, useDroppableCollectionState, useListState } from 'react-stately';
import {
  mergeProps,
  useFocusRing,
  useListBox,
  useOption,
  ListDropTargetDelegate,
  ListKeyboardDelegate,
  useDroppableCollection,
  useDroppableItem,
} from 'react-aria';
import { useSession } from '@supabase/auth-helpers-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookmarksCountTypes,
  CategoriesData,
  FetchSharedCategoriesData,
} from '../../../types/apiTypes';
import { PostgrestError } from '@supabase/supabase-js';
import {
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
} from '../../../utils/constants';
import SingleListItemComponent from './singleListItemComponent';
import { useRouter } from 'next/router';
import isEmpty from 'lodash/isEmpty';
import find from 'lodash/find';
import FileIcon from '../../../icons/categoryIcons/fileIcon';
import AddCategoryIcon from '../../../icons/addCategoryIcon';
import { useLoadersStore } from '../../../store/componentStore';

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

  const sidePaneOptionLoading = useLoadersStore(
    (state) => state.sidePaneOptionLoading
  );

  function ListBoxDrop(props: any) {
    // Setup listbox as normal. See the useListBox docs for more details.
    const state = useListState(props);
    const ref = React.useRef(null);
    const { listBoxProps } = useListBox(props, state, ref);

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
          />
        ))}
      </ul>
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  function OptionDrop({ item, state, dropState }) {
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
      <li
        {...mergeProps(optionProps, dropProps, focusProps)}
        ref={ref}
        // Apply a class when the item is the active drop target.
        className={`option-drop ${isFocusVisible ? 'focus-visible' : ''} ${
          isDropTarget ? 'drop-target' : ''
        }`}
      >
        {item.rendered}
      </li>
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

  return (
    <div className="pt-[25px]">
      <p className="font-medium text-[13px] leading-[115%] px-1 text-custom-gray-3">
        Collections
      </p>
      <div className="pt-3">
        <div id="collections-wrapper">
          <ListBoxDrop
            aria-label="Categories-drop"
            selectionMode="single"
            onItemDrop={(e: any) => {
              onBookmarksDrop(e);
            }}
          >
            {collectionsList?.map((item, index) => {
              return (
                <Item key={item?.id}>
                  <SingleListItemComponent
                    extendedClassname="py-[5px]"
                    item={item}
                    key={index}
                    showDropdown={true}
                    listNameId="collection-name"
                    onCategoryOptionClick={onCategoryOptionClick}
                    onIconSelect={onIconSelect}
                    showSpinner={item?.id === sidePaneOptionLoading}
                    // showSpinner={item?.id === 295}
                  />
                </Item>
              );
            })}
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
