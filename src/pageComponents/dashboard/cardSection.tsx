/* eslint-disable @next/next/no-img-element */
import {
  MinusCircleIcon,
  PencilAltIcon,
  TrashIcon,
} from "@heroicons/react/solid";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import format from "date-fns/format";
import { flatten, type Many } from "lodash";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import { useRouter } from "next/router";
import React, { useEffect, type Key, type ReactNode } from "react";
import {
  DragPreview,
  mergeProps,
  useDraggableCollection,
  useDraggableItem,
  useFocusRing,
  useListBox,
  useOption,
  type DraggableItemProps,
  type DragItem,
} from "react-aria";
import Avatar from "react-avatar";
import {
  Item,
  useDraggableCollectionState,
  useListState,
  type DraggableCollectionState,
  type ListProps,
  type ListState,
} from "react-stately";

import Badge from "../../components/badge";
import Spinner from "../../components/spinner";
import LinkExternalIcon from "../../icons/linkExternalIcon";
import { useMiscellaneousStore } from "../../store/componentStore";
import type {
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
  SingleListData,
} from "../../types/apiTypes";
import type { BookmarksViewTypes } from "../../types/componentStoreTypes";
import { options } from "../../utils/commonData";
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  SEARCH_URL,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
  USER_PROFILE,
} from "../../utils/constants";
import { getBaseUrl, isUserInACategory } from "../../utils/helpers";

interface CardSectionProps {
  listData: Array<SingleListData>;
  onDeleteClick: (post: SingleListData) => void;
  onMoveOutOfTrashClick: (post: SingleListData) => void;
  onEditClick: (item: SingleListData) => void;
  userId: string;
  showAvatar: boolean;
  isOgImgLoading: boolean;
  isBookmarkLoading: boolean;
  deleteBookmarkId: number | undefined;
}
interface ListBoxDropTypes extends ListProps<object> {
  getItems?: (keys: Set<Key>) => DragItem[];
  // onReorder: (e: DroppableCollectionReorderEvent) => unknown;
  onItemDrop?: (e: any) => void;
  // bookmarksColumns: string | number[] | string[] | undefined;
  bookmarksColumns: number[];
  cardTypeCondition: unknown;
  bookmarksList: SingleListData[];
}

const ListBox = (props: ListBoxDropTypes) => {
  const { getItems, bookmarksColumns, cardTypeCondition, bookmarksList } =
    props;
  const setIsCardDragging = useMiscellaneousStore(
    state => state.setIsCardDragging,
  );
  // Setup listbox as normal. See the useListBox docs for more details.
  const preview = React.useRef(null);
  const state = useListState(props);
  const ref = React.useRef(null);
  const { listBoxProps } = useListBox(
    {
      ...props,
      // Prevent dragging from changing selection.
      shouldSelectOnPressUp: true,
    },
    state,
    ref,
  );

  // Setup drag state for the collection.
  const dragState = useDraggableCollectionState({
    // Pass through events from props.
    ...props,

    // Collection and selection manager come from list state.
    collection: state.collection,
    selectionManager: state.selectionManager,
    onDragStart() {
      setIsCardDragging(true);
    },
    onDragEnd() {
      setIsCardDragging(false);
      state.selectionManager.clearSelection();
    },
    preview,
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

  const cardGridClassNames = classNames({
    "grid gap-6": true,
    "grid-cols-1":
      typeof bookmarksColumns === "object" &&
      !isNull(bookmarksColumns) &&
      bookmarksColumns[0] === 10,
    "grid-cols-2":
      typeof bookmarksColumns === "object" && bookmarksColumns[0] === 20,
    "grid-cols-3":
      typeof bookmarksColumns === "object" && bookmarksColumns[0] === 30,
    "grid-cols-4":
      typeof bookmarksColumns === "object" && bookmarksColumns[0] === 40,
    "grid-cols-5":
      typeof bookmarksColumns === "object" && bookmarksColumns[0] === 50,
  });

  const ulClassName = classNames("outline-none focus:outline-none", {
    [`columns-${
      bookmarksColumns && (bookmarksColumns[0] / 10)?.toString()
    } gap-6`]: cardTypeCondition === "moodboard",
    block: cardTypeCondition === "list" || cardTypeCondition === "headlines",
    [cardGridClassNames]: cardTypeCondition === "card",
  });

  return (
    <ul {...listBoxProps} ref={ref} className={ulClassName}>
      {[...state.collection].map(item => {
        return (
          <Option
            key={item.key}
            item={item}
            state={state}
            dragState={dragState}
            cardTypeCondition={cardTypeCondition}
            url={
              find(
                bookmarksList,
                listItem => listItem?.id === parseInt(item.key as string, 10),
              )?.url || ""
            }
          />
        );
      })}
      <DragPreview ref={preview}>
        {items => (
          <div className="rounded-lg bg-slate-200 px-2 py-1 text-sm leading-4">
            {items.length > 1
              ? `${items.length} bookmarks`
              : find(
                  bookmarksList,
                  item => item?.id === parseInt(items[0]["text/plain"], 10),
                )?.title}
          </div>
        )}
      </DragPreview>
    </ul>
  );
};

interface OptionDropItemTypes extends DraggableItemProps {
  rendered: ReactNode;
}

const Option = ({
  item,
  state,
  dragState,
  cardTypeCondition,
  url,
}: {
  item: OptionDropItemTypes;
  state: ListState<unknown>;
  dragState: DraggableCollectionState;
  cardTypeCondition: unknown;
  url: string;
}) => {
  // Setup listbox option as normal. See useListBox docs for details.
  const ref = React.useRef(null);
  const { optionProps, isSelected } = useOption({ key: item.key }, state, ref);
  const { focusProps } = useFocusRing();

  // Register the item as a drag source.
  const { dragProps } = useDraggableItem(
    {
      key: item.key,
    },
    dragState,
  );
  // Merge option props and dnd props, and render the item.

  const liClassName = classNames(
    "single-bookmark group relative flex cursor-pointer rounded-lg duration-150 ",
    {
      "mb-6": cardTypeCondition === "moodboard",
      "mb-[18px]": cardTypeCondition === "card",
      "hover:shadow-custom-4":
        cardTypeCondition === "moodboard" || cardTypeCondition === "card",
      "hover:bg-custom-gray-8 mb-1":
        cardTypeCondition === "list" || cardTypeCondition === "headlines",
    },
  );

  return (
    <li
      {...mergeProps(dragProps, focusProps)}
      ref={ref}
      // className="single-bookmark group relative mb-6 flex cursor-pointer rounded-lg duration-150 hover:shadow-custom-4"
      className={liClassName}
    >
      {/* we are disabling as this a tag is only to tell card is a link , but its eventually not functional */}
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a
        href={url}
        onClick={e => e.preventDefault()}
        draggable={false}
        className={`absolute top-0 left-0 h-full w-full rounded-lg opacity-50 ${
          isSelected ? "bg-slate-600" : ""
        }`}
      />
      <input
        type="checkbox"
        checked={isSelected}
        {...optionProps}
        // eslint-disable-next-line tailwindcss/no-custom-classname
        className={`card-checkbox absolute top-[7px] left-[6px] z-20 group-hover:block ${
          isSelected ? "block" : "hidden"
        }`}
      />
      {item.rendered}
    </li>
  );
};
const CardSection = ({
  listData = [],
  onDeleteClick,
  onMoveOutOfTrashClick,
  onEditClick = () => null,
  userId,
  showAvatar = false,
  isOgImgLoading = false,
  isBookmarkLoading = false,
  deleteBookmarkId,
}: CardSectionProps) => {
  const router = useRouter();
  const categorySlug = router?.asPath?.split("/")[1] || null; // cat_id reffers to cat slug here as its got from url
  const queryClient = useQueryClient();

  const isDeleteBookmarkLoading = false;
  const searchText = useMiscellaneousStore(state => state.searchText);
  const setCurrentBookmarkView = useMiscellaneousStore(
    state => state.setCurrentBookmarkView,
  );

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const categoryIdFromSlug = find(
    categoryData?.data,
    item => item?.category_slug === categorySlug,
  )?.id;

  const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
    data: ProfilesTableTypes[];
    error: PostgrestError;
  };

  const searchSlugKey = () => {
    if (categorySlug === ALL_BOOKMARKS_URL || categorySlug === SEARCH_URL) {
      return null;
    }
    if (typeof categoryIdFromSlug === "number") {
      return categoryIdFromSlug;
    }
    return categorySlug;
  };

  const searchBookmarksData = queryClient.getQueryData([
    BOOKMARKS_KEY,
    userId,
    // categorySlug === ALL_BOOKMARKS_URL
    //   ? null
    //   : typeof categoryIdFromSlug === "number"
    //   ? categoryIdFromSlug
    //   : categorySlug,
    searchSlugKey(),
    searchText,
  ]) as {
    data: SingleListData[];
    error: PostgrestError;
  };

  const sharedCategoriesData = queryClient.getQueryData([
    SHARED_CATEGORIES_TABLE_NAME,
  ]) as {
    data: FetchSharedCategoriesData[];
    error: PostgrestError;
  };

  const bookmarksList = isEmpty(searchText)
    ? listData
    : searchBookmarksData?.data;

  const currentCategoryData = find(
    categoryData?.data,
    item => item?.category_slug === categorySlug,
  );

  const isUserTheCategoryOwner = userId === currentCategoryData?.user_id?.id;

  const getViewValue = (
    viewType: "cardContentViewArray" | "moodboardColumns" | "bookmarksView",
    defaultReturnValue: [] | string | [number],
  ) => {
    if (isUserInACategory(categorySlug as string)) {
      if (isUserTheCategoryOwner) {
        return currentCategoryData?.category_views?.[viewType];
      }
      if (!isEmpty(sharedCategoriesData?.data)) {
        return sharedCategoriesData?.data[0]?.category_views?.[viewType];
      }
      return defaultReturnValue;
    }
    if (!isEmpty(userProfilesData?.data)) {
      return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
    }
    return defaultReturnValue;
  };

  const bookmarksInfoValue = getViewValue("cardContentViewArray", []);
  const bookmarksColumns = flatten([
    getViewValue("moodboardColumns", [10]) as Many<string | undefined>,
  ]) as unknown as number[];
  const cardTypeCondition = getViewValue("bookmarksView", "");

  useEffect(() => {
    if (!isEmpty(cardTypeCondition)) {
      setCurrentBookmarkView(cardTypeCondition as BookmarksViewTypes);
    }
  }, [cardTypeCondition, setCurrentBookmarkView]);

  const isLoggedInUserTheCategoryOwner =
    !isUserInACategory(categorySlug as string) ||
    find(categoryData?.data, item => item?.category_slug === categorySlug)
      ?.user_id?.id === userId;

  const renderEditAndDeleteCondition = (post: SingleListData) => {
    if (isLoggedInUserTheCategoryOwner) {
      return true;
    }
    // show if bookmark is created by loggedin user
    if (post?.user_id?.id === userId) {
      return true;
    }
    return false;
  };

  const isBookmarkCreatedByLoggedinUser = (post: SingleListData) => {
    // show if bookmark is created by loggedin user
    if (post?.user_id?.id === userId) {
      return true;
    }
    return false;
  };

  const singleBookmarkCategoryData = (category_id: number) => {
    const name = find(categoryData?.data, item => item?.id === category_id);

    return name as CategoriesData;
  };

  // category owner can only see edit icon and can change to un-cat for bookmarks that are created by colaborators
  const renderEditAndDeleteIcons = (post: SingleListData) => {
    const iconBgClassName =
      "rounded-lg bg-custom-white-1 p-[7px] backdrop-blur-sm";

    if (renderEditAndDeleteCondition(post)) {
      return (
        <>
          {categorySlug === TRASH_URL && (
            <figure className={`${iconBgClassName}`}>
              <MinusCircleIcon
                className="h-4 w-4 cursor-pointer text-red-400"
                onClick={e => {
                  e.preventDefault();
                  onMoveOutOfTrashClick(post);
                }}
              />
            </figure>
          )}

          <div
            onClick={() => window.open(post?.url, "_blank")}
            role="button"
            onKeyDown={() => {}}
            tabIndex={0}
          >
            <figure className={`${iconBgClassName} ml-1`}>
              <LinkExternalIcon />
            </figure>
          </div>
          {isBookmarkCreatedByLoggedinUser(post) ? (
            <>
              <figure className={`ml-1 ${iconBgClassName}`}>
                <PencilAltIcon
                  className="h-4 w-4 cursor-pointer text-gray-700"
                  onClick={e => {
                    e.preventDefault();
                    onEditClick(post);
                  }}
                />
              </figure>
              {isDeleteBookmarkLoading && deleteBookmarkId === post?.id ? (
                <div>
                  <Spinner size={15} />
                </div>
              ) : (
                <figure className={`ml-1 ${iconBgClassName}`}>
                  <TrashIcon
                    id="delete-bookmark-icon"
                    className="h-4 w-4 cursor-pointer text-red-400"
                    aria-hidden="true"
                    onClick={e => {
                      e.preventDefault();
                      onDeleteClick(post);
                    }}
                  />
                </figure>
              )}
            </>
          ) : (
            <figure>
              <PencilAltIcon
                className="h-4 w-4 cursor-pointer text-gray-700"
                onClick={e => {
                  e.preventDefault();
                  onEditClick(post);
                }}
              />
            </figure>
          )}
        </>
      );
    }
    return null;
  };

  const renderAvatar = (item: SingleListData) => {
    return (
      <Avatar
        name={item?.user_id?.email}
        src={item?.user_id?.profile_pic}
        size="20"
        round
        className="mr-1"
      />
    );
  };

  const renderUrl = (item: SingleListData) => {
    return (
      <p
        className={`relative text-[13px] leading-4  text-custom-gray-10 ${
          !isNull(item?.category_id) && isNull(categorySlug)
            ? "pl-3 before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-black before:content-['']"
            : ""
        }`}
        id="base-url"
      >
        {getBaseUrl(item?.url)}
      </p>
    );
  };

  const renderOgImage = (img: string) => {
    const imgClassName = classNames({
      "h-[48px] w-[80px] object-cover rounded": cardTypeCondition === "list",
      "h-[194px] w-full object-cover duration-150 rounded-lg group-hover:rounded-b-none":
        cardTypeCondition === "card",
      "rounded-lg w-full group-hover:rounded-t-lg":
        cardTypeCondition === "moodboard",
      "h-4 w-4 rounded object-cover": cardTypeCondition === "headlines",
    });

    const loaderClassName = classNames({
      "animate-pulse bg-slate-200 w-full h-14 w-20 object-cover":
        cardTypeCondition === "list",
      "animate-pulse bg-slate-200 w-full h-[194px] w-full object-cover":
        cardTypeCondition === "card",
      "animate-pulse h-36 bg-slate-200 w-full rounded-lg w-full":
        cardTypeCondition === "moodboard",
    });

    const figureClassName = classNames({
      "h-[48px] w-[80px] ": cardTypeCondition === "list",
      "w-full h-[194px] ": cardTypeCondition === "card",
      "h-36":
        cardTypeCondition === "moodboard" &&
        (isOgImgLoading || isBookmarkLoading) &&
        img === undefined,
      "h-4 w-4": cardTypeCondition === "headlines",
    });

    return (
      <figure className={figureClassName}>
        {bookmarksInfoValue?.includes("cover" as never) && (
          <>
            {(isOgImgLoading || isBookmarkLoading) && img === undefined ? (
              <div className={loaderClassName} />
            ) : (
              <>
                {img && (
                  <img src={img} alt="bookmark-img" className={imgClassName} />
                )}
              </>
            )}
          </>
        )}
      </figure>
    );
  };

  const renderCategoryBadge = (item: SingleListData) => {
    const bookmarkCategoryData = singleBookmarkCategoryData(item?.category_id);
    return (
      <>
        {!isNull(item?.category_id) &&
          categorySlug === ALL_BOOKMARKS_URL &&
          item?.category_id !== 0 && (
            <Badge
              renderBadgeContent={() => {
                return (
                  <div className="flex items-center">
                    <figure className="h-[12px] w-[12px]">
                      {find(
                        options,
                        optionItem =>
                          optionItem?.label === bookmarkCategoryData?.icon,
                      )?.icon()}
                    </figure>
                    <p className="ml-1">
                      {bookmarkCategoryData?.category_name}
                    </p>
                  </div>
                );
              }}
            />
          )}
      </>
    );
  };

  const renderSortByCondition = () => {
    return bookmarksList?.map(item => {
      return {
        ...item,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore // disabling because don't know why ogimage is in smallcase
        ogImage: item?.ogImage || (item?.ogimage as string),
      };
    });
  };

  const renderBookmarkCardTypes = (item: SingleListData) => {
    switch (cardTypeCondition) {
      case "moodboard":
        return renderMoodboardAndCardType(item);
      case "card":
        return renderMoodboardAndCardType(item);
      case "headlines":
        return renderHeadlinesCard(item);
      case "list":
        return renderListCard(item);
      default:
        return renderMoodboardAndCardType(item);
    }
  };

  const renderMoodboardAndCardType = (item: SingleListData) => {
    return (
      <div id="single-moodboard-card" className="w-full">
        <div className="inline-block w-full">
          {renderOgImage(item?.ogImage)}
          {bookmarksInfoValue?.length === 1 &&
          bookmarksInfoValue[0] === "cover" ? null : (
            <div className="space-y-[6px] rounded-lg px-2 py-3">
              {bookmarksInfoValue?.includes("title" as never) && (
                <p className=" text-sm font-medium leading-4 text-custom-gray-5">
                  {item?.title}
                </p>
              )}
              {bookmarksInfoValue?.includes("description" as never) &&
                !isEmpty(item?.description) && (
                  <p className="overflow-hidden break-all  text-sm leading-4">
                    {item?.description}
                  </p>
                )}
              <div className="space-y-[6px]">
                {bookmarksInfoValue?.includes("tags" as never) && (
                  <div className="flex items-center space-x-1">
                    {item?.addedTags?.map(tag => {
                      return (
                        <div className="text-xs text-blue-500" key={tag?.id}>
                          #{tag?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
                {bookmarksInfoValue?.includes("info" as never) && (
                  <div className="flex flex-wrap items-center space-x-2">
                    {renderCategoryBadge(item)}
                    {renderUrl(item)}
                    <p className="relative text-[13px]  font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
                      {format(new Date(item?.inserted_at), "MMMM dd")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* {renderOgImage(item?.ogImage)}
          {bookmarksInfoValue?.length === 1 &&
          bookmarksInfoValue[0] === "cover" ? null : (
            <div className="space-y-2 rounded-lg p-4">
              {bookmarksInfoValue?.includes("title" as never) && (
                <p className="text-base font-medium leading-4">{item?.title}</p>
              )}
              {bookmarksInfoValue?.includes("description" as never) && (
                <p className="overflow-hidden break-all  text-sm leading-4">
                  {item?.description}
                </p>
              )}
              <div className="space-y-2">
                {bookmarksInfoValue?.includes("tags" as never) && (
                  <div className="flex items-center space-x-1">
                    {item?.addedTags?.map(tag => {
                      return (
                        <div className="text-xs text-blue-500" key={tag?.id}>
                          #{tag?.name}
                        </div>
                      );
                    })}
                  </div>
                )}
                {bookmarksInfoValue?.includes("info" as never) && (
                  <div className="flex flex-wrap items-center space-x-2">
                    {renderCategoryBadge(item)}
                    {renderUrl(item)}
                    <p className="relative pl-3 text-xs leading-4 before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-black before:content-['']">
                      {format(new Date(item?.inserted_at), "dd MMM")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )} */}
          <div
            // eslint-disable-next-line tailwindcss/no-custom-classname
            className={`items-center space-x-1 ${
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore // this is cypress env, TS check not needed
              window?.Cypress ? "flex" : "hidden"
            } helper-icons absolute right-[8px] top-[10px] group-hover:flex`}
          >
            {showAvatar && renderAvatar(item)}
            {renderEditAndDeleteIcons(item)}
          </div>
        </div>
      </div>
    );
  };

  const renderListCard = (item: SingleListData) => {
    return (
      <div
        id="single-moodboard-card"
        className="flex h-[64px] w-full items-center p-2"
      >
        {renderOgImage(item?.ogImage)}
        {bookmarksInfoValue?.length === 1 &&
        bookmarksInfoValue[0] === "cover" ? null : (
          <div className=" ml-3">
            {bookmarksInfoValue?.includes("title" as never) && (
              <p className=" text-sm font-medium leading-4 text-custom-gray-5">
                {item?.title}
              </p>
            )}
            <div className="flex items-center space-y-2 space-x-1">
              {bookmarksInfoValue?.includes("description" as never) &&
                !isEmpty(item.description) && (
                  <p className="mt-[6px] max-w-[400px] overflow-hidden truncate break-all text-13 font-450 leading-4 text-custom-gray-10">
                    {item?.description}
                  </p>
                )}
              {bookmarksInfoValue?.includes("tags" as never) && (
                <div className="mt-[6px] flex items-center space-x-1">
                  {item?.addedTags?.map(tag => {
                    return (
                      <div className="text-xs text-blue-500" key={tag?.id}>
                        #{tag?.name}
                      </div>
                    );
                  })}
                </div>
              )}
              {bookmarksInfoValue?.includes("info" as never) && (
                <div className="mt-[6px] flex items-center space-x-2">
                  {renderCategoryBadge(item)}
                  {renderUrl(item)}
                  <p className="relative text-13 font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
                    {format(new Date(item?.inserted_at), "dd MMM")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="absolute right-[8px] top-[15px] hidden items-center space-x-1 group-hover:flex">
          {showAvatar && renderAvatar(item)}
          {renderEditAndDeleteIcons(item)}
        </div>
      </div>
    );
  };

  const renderHeadlinesCard = (item: SingleListData) => {
    return (
      <div key={item?.id} className="group flex h-[53px] w-full p-2">
        {renderOgImage(item?.ogImage)}
        {bookmarksInfoValue?.length === 1 &&
        bookmarksInfoValue[0] === "cover" ? null : (
          <div className=" ml-[10px]">
            {bookmarksInfoValue?.includes("title" as never) && (
              <p className=" text-sm font-medium leading-4 text-custom-gray-5">
                {item?.title}
              </p>
            )}
            <div className="mt-[6px] space-y-2">
              {/* {bookmarksInfoValue?.includes("tags" as never) && (
                <div className="flex items-center space-x-1">
                  {item?.addedTags?.map(tag => {
                    return (
                      <div className="text-xs text-blue-500" key={tag?.id}>
                        #{tag?.name}
                      </div>
                    );
                  })}
                </div>
              )} */}
              {bookmarksInfoValue?.includes("info" as never) && (
                <div className="flex items-center space-x-2">
                  {/* {renderCategoryBadge(item)} */}
                  {renderUrl(item)}
                  <p className="relative text-13 font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
                    {format(new Date(item?.inserted_at), "dd MMM")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="absolute right-[8px] top-[11px] hidden items-center space-x-1 group-hover:flex">
          {showAvatar && renderAvatar(item)}
          {renderEditAndDeleteIcons(item)}
        </div>
      </div>
    );
  };

  const listWrapperClass = classNames({
    "p-2": cardTypeCondition === "list" || cardTypeCondition === "headlines",
    "p-6": cardTypeCondition === "moodboard" || cardTypeCondition === "card",
  });

  return (
    <div className={listWrapperClass}>
      <ListBox
        aria-label="Categories"
        selectionMode="multiple"
        bookmarksColumns={bookmarksColumns}
        cardTypeCondition={cardTypeCondition}
        bookmarksList={bookmarksList}
      >
        {renderSortByCondition()?.map(item => {
          return (
            <Item key={item?.id} textValue={item?.id?.toString()}>
              {renderBookmarkCardTypes(item)}
            </Item>
          );
        })}
      </ListBox>
    </div>
  );
};

export default CardSection;
