/* eslint-disable @next/next/no-img-element */

import { CategoriesData, SingleListData } from '../../types/apiTypes';
import {
  MinusCircleIcon,
  PencilAltIcon,
  TrashIcon,
} from '@heroicons/react/solid';
import orderBy from 'lodash/orderBy';
import { useRouter } from 'next/router';
import {
  ALL_BOOKMARKS_URL,
  CATEGORIES_KEY,
  INBOX_URL,
  SEARCH_URL,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../utils/constants';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import Spinner from '../../components/spinner';
import {
  useBookmarkCardViewState,
  useLoadersStore,
} from '../../store/componentStore';
import Avatar from 'react-avatar';
import { useQueryClient } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';
import Badge from '../../components/badge';
import isNull from 'lodash/isNull';
import Masonry from 'react-masonry-css';
import MasonryCardSkeleton from '../../components/loadersSkeleton/masonryCardSkeleton';
import { getBaseUrl } from '../../utils/helpers';
import format from 'date-fns/format';
import classNames from 'classnames';
import { options } from '../../utils/commonData';

interface CardSectionProps {
  listData: Array<SingleListData>;
  onDeleteClick: (post: SingleListData) => void;
  onMoveOutOfTrashClick: (post: SingleListData) => void;
  onEditClick: (item: SingleListData) => void;
  isLoading: boolean;
  userId: string;
  showAvatar: boolean;
  isOgImgLoading: boolean;
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
  // isOgImgLoading = false,
  // addScreenshotBookmarkId,
  deleteBookmarkId,
}: CardSectionProps) => {
  const router = useRouter();
  const category_id = router?.asPath?.split('/')[1] || null;
  const queryClient = useQueryClient();

  const isDeleteBookmarkLoading = useLoadersStore(
    (state) => state.isDeleteBookmarkLoading
  );

  const moodboardColumns = useBookmarkCardViewState(
    (state) => state.moodboardColumns
  );

  const cardContentViewArray = useBookmarkCardViewState(
    (state) => state.cardContentViewArray
  );

  const bookmarksView = useBookmarkCardViewState(
    (state) => state.bookmarksView
  );

  const sortBy = useBookmarkCardViewState((state) => state.sortBy);

  // TODO: make this dependant on react-query
  const bookmarksList =
    category_id === UNCATEGORIZED_URL
      ? listData?.filter((item) => item?.category_id === null)
      : listData;

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const currentCategoryData = find(
    categoryData?.data,
    (item) => item?.category_slug === category_id
  );

  const nonCategoryPages = [
    ALL_BOOKMARKS_URL,
    UNCATEGORIZED_URL,
    INBOX_URL,
    SEARCH_URL,
    TRASH_URL,
  ];

  const isLoggedInUserTheCategoryOwner =
    nonCategoryPages?.includes(category_id as string) ||
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
              <PencilAltIcon
                className="h-5 w-5 text-gray-400 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  onEditClick(post);
                }}
              />
              {isDeleteBookmarkLoading && deleteBookmarkId === post?.id ? (
                <div>
                  <Spinner size={15} />
                </div>
              ) : (
                <TrashIcon
                  className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                  aria-hidden="true"
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteClick(post);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <PencilAltIcon
                className="h-5 w-5 text-gray-700 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  onEditClick(post);
                }}
              />
            </>
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
        name={item?.user_id?.user_name}
        src={item?.user_id?.profile_pic}
        size="20"
        round={true}
        className="mr-1"
      />
    );
  };

  const renderCategoryBadge = (item: SingleListData) => {
    const categoryData = singleBookmarkCategoryData(item?.category_id);
    return (
      <>
        {!isNull(item?.category_id) && category_id === ALL_BOOKMARKS_URL && (
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

  // return (
  //   <div className="relative pb-20 lg:pb-28">
  //     <div className="absolute inset-0">
  //       <div className="bg-white h-1/3 sm:h-2/3" />
  //     </div>
  //     <div className="relative max-w-7xl mx-auto">
  //       <div className="mt-12 max-w-lg mx-auto grid gap-5 lg:grid-cols-3 lg:max-w-none">
  //         {isLoading ? (
  //           <>
  //             <BookmarkCardSkeleton />
  //             <BookmarkCardSkeleton />
  //           </>
  //         ) : (
  //           <>
  //             {!isEmpty(bookmarksList) ? (
  //               <>
  //                 {renderSortByCondition().map((post) => (
  //                   <div
  //                     key={post.id}
  //                     className="flex flex-col rounded-lg shadow-lg overflow-hidden"
  //                   >
  //                     <div className="flex-shrink-0">
  //                       {isOgImgLoading &&
  //                       addScreenshotBookmarkId === post?.id ? (
  //                         <div className="h-48 w-full bg-slate-100 flex justify-center items-center">
  //                           <Spinner />
  //                         </div>
  //                       ) : (
  //                         <img
  //                           className="h-48 w-full object-cover"
  //                           src={post.ogImage || post.screenshot}
  //                           alt=""
  //                         />
  //                       )}
  //                     </div>
  //                     <div className="flex-1 bg-white p-6 flex justify-between">
  //                       <div className="flex-1">
  //                         <div className="text-sm font-medium text-indigo-600">
  //                           <span className="flex space-x-1">
  //                             {post?.addedTags?.map((tag) => {
  //                               return <div key={tag?.id}>#{tag?.name}</div>;
  //                             })}
  //                           </span>
  //                         </div>
  //                         <a
  //                           href={post.url}
  //                           target="_blank"
  //                           rel="noreferrer"
  //                           className="block mt-2"
  //                         >
  //                           <p className="text-xl font-semibold text-gray-900">
  //                             {post.title}
  //                           </p>
  //                           <p className="mt-3 text-base text-gray-500">
  //                             {post.description}
  //                           </p>
  //                         </a>
  //                         {!isNull(post?.category_id) && isNull(category_id) && (
  //                           <div className="mt-2">
  //                             <Badge
  //                               label={singleBookmarkCategoryName(
  //                                 post?.category_id
  //                               )}
  //                             />
  //                           </div>
  //                         )}
  //                       </div>
  //                       <div className="flex">
  //                         {showAvatar && (
  //                           <Avatar
  //                             name={post?.user_id}
  //                             size="20"
  //                             round={true}
  //                             className="mr-1"
  //                           />
  //                         )}
  //                         {renderEditAndDeleteIcons(post)}
  //                       </div>
  //                     </div>
  //                   </div>
  //                 ))}
  //               </>
  //             ) : (
  //               <div className="text-xl font-bold">No Bookmarks</div>
  //             )}
  //           </>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // );

  const renderSortByCondition = () => {
    switch (sortBy) {
      case 'date-sort-acending':
        return orderBy(bookmarksList, ['id'], ['desc']);
      case 'date-sort-decending':
        return orderBy(bookmarksList, ['id'], ['asc']);
      case 'alphabetical-sort-acending':
        return orderBy(bookmarksList, ['title'], ['asc']);
      case 'alphabetical-sort-decending':
        return orderBy(bookmarksList, ['title'], ['desc']);
      case 'url-sort-acending':
        return orderBy(bookmarksList, ['url'], ['asc']);
      case 'url-sort-decending':
        return orderBy(bookmarksList, ['url'], ['desc']);
    }
  };

  const renderHeadlinesType = () => {
    return (
      <div className="space-y-4">
        {renderSortByCondition()?.map((item) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id}
              className="group relative"
            >
              <a
                href={item?.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                {cardContentViewArray?.length === 1 &&
                cardContentViewArray[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {cardContentViewArray?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    <div className="space-y-2">
                      {cardContentViewArray?.includes('tags') && (
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
                      {cardContentViewArray?.includes('info') && (
                        <div className="flex items-center space-x-2">
                          {renderCategoryBadge(item)}
                          <p
                            className={`text-xs leading-4 relative ${
                              !isNull(item?.category_id) && isNull(category_id)
                                ? "pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']"
                                : ''
                            }`}
                          >
                            {getBaseUrl(item?.url)}
                          </p>
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
        {renderSortByCondition()?.map((item) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id}
              className="group relative"
            >
              <a
                href={item?.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                <figure>
                  {cardContentViewArray?.includes('cover') && (
                    <img
                      src={item?.ogImage}
                      alt="bookmark-img"
                      // className="rounded-lg w-full"
                      className=" h-14 w-full object-cover"
                    />
                  )}
                </figure>
                {cardContentViewArray?.length === 1 &&
                cardContentViewArray[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {cardContentViewArray?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {cardContentViewArray?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {cardContentViewArray?.includes('tags') && (
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
                      {cardContentViewArray?.includes('info') && (
                        <div className="flex items-center space-x-2">
                          {renderCategoryBadge(item)}
                          <p
                            className={`text-xs leading-4 relative ${
                              !isNull(item?.category_id) && isNull(category_id)
                                ? "pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']"
                                : ''
                            }`}
                          >
                            {getBaseUrl(item?.url)}
                          </p>
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
      typeof moodboardColumns === 'object' && moodboardColumns[0] === 10,
    'grid-cols-2':
      typeof moodboardColumns === 'object' && moodboardColumns[0] === 20,
    'grid-cols-3':
      typeof moodboardColumns === 'object' && moodboardColumns[0] === 30,
    'grid-cols-4':
      typeof moodboardColumns === 'object' && moodboardColumns[0] === 40,
    'grid-cols-5':
      typeof moodboardColumns === 'object' && moodboardColumns[0] === 50,
  });

  const renderCardType = () => {
    return (
      <div className={cardGridClassNames}>
        {renderSortByCondition()?.map((item) => {
          return (
            <div
              style={{ boxShadow: '0px 0px 2.5px rgba(0, 0, 0, 0.11)' }} // added inline as its not working via tailwind
              key={item?.id}
              className="group relative"
            >
              <a href={item?.url} target="_blank" rel="noreferrer">
                <figure>
                  {cardContentViewArray?.includes('cover') && (
                    <img
                      src={item?.ogImage}
                      alt="bookmark-img"
                      // className="rounded-lg w-full"
                      className="h-48 w-full object-cover"
                    />
                  )}
                </figure>
                {cardContentViewArray?.length === 1 &&
                cardContentViewArray[0] === 'cover' ? null : (
                  <div className="p-4 space-y-2">
                    {cardContentViewArray?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {cardContentViewArray?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {cardContentViewArray?.includes('tags') && (
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
                      {cardContentViewArray?.includes('info') && (
                        <div className="flex items-center space-x-2 flex-wrap">
                          {renderCategoryBadge(item)}
                          <p
                            className={`text-xs leading-4 relative ${
                              !isNull(item?.category_id) && isNull(category_id)
                                ? "pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']"
                                : ''
                            }`}
                          >
                            {getBaseUrl(item?.url)}
                          </p>
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
            typeof moodboardColumns === 'object'
              ? moodboardColumns[0] / 10
              : moodboardColumns / 10,
          1100: 2,
          700: 2,
          500: 1,
        }}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {renderSortByCondition()?.map((item) => {
          return (
            <div
              key={item?.id}
              className="rounded-lg drop-shadow-custom-1 group relative"
            >
              <a href={item?.url} target="_blank" rel="noreferrer">
                <figure>
                  {cardContentViewArray?.includes('cover') && (
                    <img
                      src={item?.ogImage}
                      alt="bookmark-img"
                      className="rounded-lg w-full"
                    />
                  )}
                </figure>
                {cardContentViewArray?.length === 1 &&
                cardContentViewArray[0] === 'cover' ? null : (
                  <div className="rounded-lg p-4 space-y-2">
                    {cardContentViewArray?.includes('title') && (
                      <p className="text-base font-medium leading-4">
                        {item?.title}
                      </p>
                    )}
                    {cardContentViewArray?.includes('description') && (
                      <p className="text-sm leading-4  overflow-hidden break-all">
                        {item?.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {cardContentViewArray?.includes('tags') && (
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
                      {cardContentViewArray?.includes('info') && (
                        <div className="flex items-center space-x-2 flex-wrap">
                          {renderCategoryBadge(item)}
                          <p
                            className={`text-xs leading-4 relative ${
                              !isNull(item?.category_id) && isNull(category_id)
                                ? "pl-3 before:w-1 before:h-1 before:bg-black before:absolute before:left-0 before:top-1.5 before:rounded-full before:content-['']"
                                : ''
                            }`}
                          >
                            {getBaseUrl(item?.url)}
                          </p>
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
      </Masonry>
    );
  };

  const renderBookmarkCardTypes = () => {
    switch (currentCategoryData?.category_views?.bookmarksView) {
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
            bookmarksView === 'card' || bookmarksView === 'moodboard'
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
        return <div>No Bookmarks</div>;
      }
    }
  };

  return renderMainCardContent();
};

export default CardSection;
