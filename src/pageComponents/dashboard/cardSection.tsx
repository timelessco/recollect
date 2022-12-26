/* eslint-disable @next/next/no-img-element */

import {
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
  SingleListData,
} from '../../types/apiTypes';
import {
  MinusCircleIcon,
  PencilAltIcon,
  TrashIcon,
} from '@heroicons/react/solid';
import { useRouter } from 'next/router';
import {
  ALL_BOOKMARKS_URL,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
  USER_PROFILE,
} from '../../utils/constants';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import Spinner from '../../components/spinner';
import Avatar from 'react-avatar';
import { useQueryClient } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';
import Badge from '../../components/badge';
import isNull from 'lodash/isNull';
import Masonry from 'react-masonry-css';
import MasonryCardSkeleton from '../../components/loadersSkeleton/masonryCardSkeleton';
import { getBaseUrl, isUserInACategory } from '../../utils/helpers';
import format from 'date-fns/format';
import classNames from 'classnames';
import { options } from '../../utils/commonData';
import { useMiscellaneousStore } from '../../store/componentStore';

interface CardSectionProps {
  listData: Array<SingleListData>;
  onDeleteClick: (post: SingleListData) => void;
  onMoveOutOfTrashClick: (post: SingleListData) => void;
  onEditClick: (item: SingleListData) => void;
  isLoading: boolean;
  userId: string;
  showAvatar: boolean;
  isOgImgLoading: boolean;
  isBookmarkLoading: boolean;
  addScreenshotBookmarkId: number | undefined;
  deleteBookmarkId: number | undefined;
}

const CardSection = ({
  listData = [],
  onDeleteClick,
  onMoveOutOfTrashClick,
  onEditClick = () => null,
  isLoading = false,
  userId,
  showAvatar = false,
  isOgImgLoading = false,
  isBookmarkLoading = false,
  // addScreenshotBookmarkId,
  deleteBookmarkId,
}: CardSectionProps) => {
  const router = useRouter();
  const category_id = router?.asPath?.split('/')[1] || null; // cat_id reffers to cat slug here as its got from url
  const queryClient = useQueryClient();

  const isDeleteBookmarkLoading = false;
  const searchText = useMiscellaneousStore((state) => state.searchText);

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const categoryIdFromSlug = find(
    categoryData?.data,
    (item) => item?.category_slug === category_id
  )?.id;

  const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
    data: ProfilesTableTypes[];
    error: PostgrestError;
  };

  const searchBookmarksData = queryClient.getQueryData([
    BOOKMARKS_KEY,
    userId,
    category_id === ALL_BOOKMARKS_URL
      ? null
      : typeof categoryIdFromSlug === 'number'
      ? categoryIdFromSlug
      : category_id,
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
    (item) => item?.category_slug === category_id
  );

  const isUserTheCategoryOwner = userId === currentCategoryData?.user_id?.id;

  const bookmarksInfoValue = isUserInACategory(category_id as string)
    ? isUserTheCategoryOwner
      ? currentCategoryData?.category_views?.cardContentViewArray
      : !isEmpty(sharedCategoriesData?.data)
      ? sharedCategoriesData?.data[0]?.category_views?.cardContentViewArray
      : []
    : !isEmpty(userProfilesData?.data)
    ? userProfilesData?.data[0]?.bookmarks_view?.cardContentViewArray
    : [];

  const bookmarksColumns = isUserInACategory(category_id as string)
    ? isUserTheCategoryOwner
      ? currentCategoryData?.category_views?.moodboardColumns
      : !isEmpty(sharedCategoriesData?.data)
      ? sharedCategoriesData?.data[0]?.category_views?.moodboardColumns
      : [10]
    : !isEmpty(userProfilesData?.data)
    ? userProfilesData?.data[0]?.bookmarks_view?.moodboardColumns
    : [10];

  const cardTypeCondition = isUserInACategory(category_id as string)
    ? isUserTheCategoryOwner
      ? currentCategoryData?.category_views?.bookmarksView
      : !isEmpty(sharedCategoriesData?.data)
      ? sharedCategoriesData?.data[0]?.category_views?.bookmarksView
      : ''
    : !isEmpty(userProfilesData?.data)
    ? userProfilesData?.data[0]?.bookmarks_view?.bookmarksView
    : '';

  const isLoggedInUserTheCategoryOwner =
    !isUserInACategory(category_id as string) ||
    find(categoryData?.data, (item) => item?.category_slug === category_id)
      ?.user_id?.id === userId;

  const renderEditAndDeleteCondition = (post: SingleListData) => {
    if (isLoggedInUserTheCategoryOwner) {
      return true;
    } else {
      // show if bookmark is created by loggedin user
      if (post?.user_id?.id === userId) {
        return true;
      } else {
        return false;
      }
    }
  };

  const isBookmarkCreatedByLoggedinUser = (post: SingleListData) => {
    // show if bookmark is created by loggedin user
    if (post?.user_id?.id === userId) {
      return true;
    } else {
      return false;
    }
  };

  const singleBookmarkCategoryData = (category_id: number) => {
    const name = find(categoryData?.data, (item) => item?.id === category_id);

    return name as CategoriesData;
  };

  // category owner can only see edit icon and can change to un-cat for bookmarks that are created by colaborators
  const renderEditAndDeleteIcons = (post: SingleListData) => {
    if (renderEditAndDeleteCondition(post)) {
      return (
        <>
          {isBookmarkCreatedByLoggedinUser(post) ? (
            <>
              <figure>
                <PencilAltIcon
                  className="h-5 w-5 text-gray-400 cursor-pointer"
                  onClick={(e) => {
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
                <figure>
                  <TrashIcon
                    id="delete-bookmark-icon"
                    className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                    aria-hidden="true"
                    onClick={(e) => {
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
                className="h-5 w-5 text-gray-700 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  onEditClick(post);
                }}
              />
            </figure>
          )}
        </>
      );
    } else {
      return null;
    }
  };

  const renderAvatar = (item: SingleListData) => {
    return (
      <Avatar
        name={item?.user_id?.email}
        src={item?.user_id?.profile_pic}
        size="20"
        round={true}
        className="mr-1 h-"
      />
    );
  };

  const renderUrl = (item: SingleListData) => {
    return (
      <p
        className={`text-xs leading-4 relative ${
          !isNull(item?.category_id) && isNull(category_id)
            ? "pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']"
            : ''
        }`}
        id="base-url"
      >
        {getBaseUrl(item?.url)}
      </p>
    );
  };

  const renderOgImage = (img: string) => {
    const imgClassName = classNames({
      'h-14 w-full object-cover': cardTypeCondition === 'list',
      'h-48 w-full object-cover': cardTypeCondition === 'card',
      'rounded-lg w-full': cardTypeCondition === 'moodboard',
    });

    const loaderClassName = classNames({
      'animate-pulse bg-slate-200 w-full h-14 w-20 object-cover':
        cardTypeCondition === 'list',
      'animate-pulse bg-slate-200 w-full h-48 w-full object-cover':
        cardTypeCondition === 'card',
      'animate-pulse h-36 bg-slate-200 w-full rounded-lg w-full':
        cardTypeCondition === 'moodboard',
    });

    const figureClassName = classNames({
      ' w-full h-14 w-20 ': cardTypeCondition === 'list',
      'w-full h-48 ': cardTypeCondition === 'card',
      ' h-36  w-full':
        cardTypeCondition === 'moodboard' &&
        (isOgImgLoading || isBookmarkLoading) &&
        img === undefined,
    });
    return (
      <figure className={figureClassName}>
        {bookmarksInfoValue?.includes('cover') && (
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
    const categoryData = singleBookmarkCategoryData(item?.category_id);
    return (
      <>
        {!isNull(item?.category_id) &&
          category_id === ALL_BOOKMARKS_URL &&
          item?.category_id !== 0 && (
            <Badge
              renderBadgeContent={() => {
                return (
                  <div className="flex items-center">
                    {find(
                      options,
                      (optionItem) => optionItem?.label === categoryData?.icon
                    )?.icon()}
                    <p className="ml-1">{categoryData?.category_name}</p>
                  </div>
                );
              }}
            />
          )}
      </>
    );
  };

  const renderSortByCondition = () => {
    return bookmarksList?.map((item) => {
      return {
        ...item,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore // disabling because don't know why ogimage is in smallcase
        ogImage: item?.ogImage || item?.ogimage,
      };
    });
  };

  const renderHeadlinesType = () => {
    return (
      <div className="space-y-4">
        {renderSortByCondition()?.map((item, index) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id || index}
              className="group relative"
            >
              <a
                href={item?.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                {bookmarksInfoValue?.length === 1 &&
                bookmarksInfoValue[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {bookmarksInfoValue?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    <div className="space-y-2">
                      {bookmarksInfoValue?.includes('tags') && (
                        <div className="flex items-center space-x-1">
                          {item?.addedTags?.map((tag) => {
                            return (
                              <div
                                className="text-xs text-blue-500"
                                key={tag?.id}
                              >
                                #{tag?.name}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {bookmarksInfoValue?.includes('info') && (
                        <div className="flex items-center space-x-2">
                          {renderCategoryBadge(item)}
                          {renderUrl(item)}
                          <p className="text-xs leading-4 relative pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']">
                            {format(new Date(item?.inserted_at), 'dd MMM')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </a>
              <div className="items-center space-x-1 hidden group-hover:flex absolute right-[8px] top-[25px]">
                {showAvatar && renderAvatar(item)}
                {renderEditAndDeleteIcons(item)}
                {category_id === TRASH_URL && (
                  <MinusCircleIcon
                    className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      onMoveOutOfTrashClick(item);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListType = () => {
    return (
      <div className="space-y-4">
        {renderSortByCondition()?.map((item, index) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id || index}
              className="group relative h-[104px]"
            >
              <a
                href={item?.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                <>{renderOgImage(item?.ogImage)}</>
                {bookmarksInfoValue?.length === 1 &&
                bookmarksInfoValue[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {bookmarksInfoValue?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {bookmarksInfoValue?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {bookmarksInfoValue?.includes('tags') && (
                        <div className="flex items-center space-x-1">
                          {item?.addedTags?.map((tag) => {
                            return (
                              <div
                                className="text-xs text-blue-500"
                                key={tag?.id}
                              >
                                #{tag?.name}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {bookmarksInfoValue?.includes('info') && (
                        <div className="flex items-center space-x-2">
                          {renderCategoryBadge(item)}
                          {renderUrl(item)}
                          <p className="text-xs leading-4 relative pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']">
                            {format(new Date(item?.inserted_at), 'dd MMM')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </a>
              <div className="items-center space-x-1 hidden group-hover:flex absolute right-[8px] top-[25px]">
                {showAvatar && renderAvatar(item)}
                {renderEditAndDeleteIcons(item)}
                {category_id === TRASH_URL && (
                  <MinusCircleIcon
                    className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      onMoveOutOfTrashClick(item);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const cardGridClassNames = classNames({
    'grid gap-3': true,
    'grid-cols-1':
      typeof bookmarksColumns === 'object' && bookmarksColumns[0] === 10,
    'grid-cols-2':
      typeof bookmarksColumns === 'object' && bookmarksColumns[0] === 20,
    'grid-cols-3':
      typeof bookmarksColumns === 'object' && bookmarksColumns[0] === 30,
    'grid-cols-4':
      typeof bookmarksColumns === 'object' && bookmarksColumns[0] === 40,
    'grid-cols-5':
      typeof bookmarksColumns === 'object' && bookmarksColumns[0] === 50,
  });

  const renderCardType = () => {
    return (
      <div className={cardGridClassNames}>
        {renderSortByCondition()?.map((item, index) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id || index}
              className="group relative"
            >
              <a href={item?.url} target="_blank" rel="noreferrer">
                <>{renderOgImage(item?.ogImage)}</>
                {bookmarksInfoValue?.length === 1 &&
                bookmarksInfoValue[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {bookmarksInfoValue?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {bookmarksInfoValue?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {bookmarksInfoValue?.includes('tags') && (
                        <div className="flex items-center space-x-1">
                          {item?.addedTags?.map((tag) => {
                            return (
                              <div
                                className="text-xs text-blue-500"
                                key={tag?.id}
                              >
                                #{tag?.name}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {bookmarksInfoValue?.includes('info') && (
                        <div className="flex items-center space-x-2 flex-wrap">
                          {renderCategoryBadge(item)}
                          {renderUrl(item)}
                          <p className="text-xs leading-4 relative pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']">
                            {format(new Date(item?.inserted_at), 'dd MMM')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </a>
              <div className="items-center space-x-1 hidden group-hover:flex absolute right-[8px] top-[10px]">
                {showAvatar && renderAvatar(item)}
                {renderEditAndDeleteIcons(item)}
                {category_id === TRASH_URL && (
                  <MinusCircleIcon
                    className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      onMoveOutOfTrashClick(item);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMoodboard = () => {
    return (
      <Masonry
        breakpointCols={{
          default:
            typeof bookmarksColumns === 'object'
              ? bookmarksColumns[0] / 10
              : (bookmarksColumns as unknown as number) / 10,
          1100: 2,
          700: 2,
          500: 1,
        }}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {renderSortByCondition()?.map((item, index) => {
          return (
            <div
              key={item?.id || index}
              className="rounded-lg drop-shadow-custom-1 group relative single-bookmark"
              id="single-moodboard-card"
            >
              <a href={item?.url} target="_blank" rel="noreferrer">
                <>{renderOgImage(item?.ogImage)}</>
                {bookmarksInfoValue?.length === 1 &&
                bookmarksInfoValue[0] === 'cover' ? null : (
                  <div className="rounded-lg p-4 space-y-2">
                    {bookmarksInfoValue?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {bookmarksInfoValue?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {bookmarksInfoValue?.includes('tags') && (
                        <div className="flex items-center space-x-1">
                          {item?.addedTags?.map((tag) => {
                            return (
                              <div
                                className="text-xs text-blue-500"
                                key={tag?.id}
                              >
                                #{tag?.name}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {bookmarksInfoValue?.includes('info') && (
                        <div className="flex items-center space-x-2 flex-wrap">
                          {renderCategoryBadge(item)}
                          {renderUrl(item)}
                          <p className="text-xs leading-4 relative pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']">
                            {format(new Date(item?.inserted_at), 'dd MMM')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </a>
              <div
                className={`items-center space-x-1 ${
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore // this is cypress env, TS check not needed
                  window?.Cypress ? 'flex' : 'hidden'
                } group-hover:flex absolute right-[8px] top-[10px] helper-icons`}
              >
                {showAvatar && renderAvatar(item)}
                {renderEditAndDeleteIcons(item)}
                {category_id === TRASH_URL && (
                  <MinusCircleIcon
                    className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      onMoveOutOfTrashClick(item);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </Masonry>
    );
  };

  const renderBookmarkCardTypes = () => {
    switch (cardTypeCondition) {
      case 'moodboard':
        return renderMoodboard();
      case 'card':
        return renderCardType();
      case 'headlines':
        return renderHeadlinesType();
      case 'list':
        return renderListType();
      default:
        return renderMoodboard();
      // code block
    }
  };

  const renderMainCardContent = () => {
    if (isLoading) {
      return (
        <div
          className={
            cardTypeCondition === 'card' || cardTypeCondition === 'moodboard'
              ? cardGridClassNames
              : 'space-y-4'
          }
        >
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
        </div>
      );
    } else {
      if (!isEmpty(bookmarksList)) {
        return renderBookmarkCardTypes();
      } else {
        return <div id="no-bookmarks-text">No Bookmarks</div>;
      }
    }
  };

  return renderMainCardContent();
};

export default CardSection;
