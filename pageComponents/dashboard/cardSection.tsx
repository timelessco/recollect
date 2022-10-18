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
  CATEGORIES_KEY,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from '../../utils/constants';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import BookmarkCardSkeleton from '../../components/loadersSkeleton/bookmarkCardSkeleton';
import Spinner from '../../components/spinner';
import {
  useLoadersStore,
  useMiscellaneousStore,
} from '../../store/componentStore';
import Avatar from 'react-avatar';
import { useQueryClient } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';
import Badge from '../../components/badge';
import isNull from 'lodash/isNull';
import Masonry from 'react-masonry-css';
import MasonryCardSkeleton from '../../components/loadersSkeleton/masonryCardSkeleton';

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
  isOgImgLoading = false,
  addScreenshotBookmarkId,
  deleteBookmarkId,
}: CardSectionProps) => {
  const router = useRouter();
  const category_id = router?.asPath?.split('/')[1] || null;
  const queryClient = useQueryClient();

  const isDeleteBookmarkLoading = useLoadersStore(
    (state) => state.isDeleteBookmarkLoading
  );

  const moodboardColumns = useMiscellaneousStore(
    (state) => state.moodboardColumns
  );

  // TODO: make this dependant on react-query
  const bookmarksList =
    category_id === UNCATEGORIZED_URL
      ? listData?.filter((item) => item?.category_id === null)
      : listData;

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const isLoggedInUserTheCategoryOwner =
    find(categoryData?.data, (item) => item?.category_slug === category_id)
      ?.user_id?.id === userId;

  const renderEditAndDeleteCondition = (post: SingleListData) => {
    if (isLoggedInUserTheCategoryOwner) {
      return true;
    } else {
      // show if bookmark is created by loggedin user
      if (post?.user_id === userId) {
        return true;
      } else {
        return false;
      }
    }
  };

  const isBookmarkCreatedByLoggedinUser = (post: SingleListData) => {
    // show if bookmark is created by loggedin user
    if (post?.user_id === userId) {
      return true;
    } else {
      return false;
    }
  };

  const singleBookmarkCategoryName = (category_id: number) => {
    const name = find(
      categoryData?.data,
      (item) => item?.id === category_id
    )?.category_name;

    return name as string;
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
  //                 {orderBy(bookmarksList, ['id'], ['desc']).map((post) => (
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

  const renderMainCardContent = () => {
    if (isLoading) {
      return (
        <Masonry
          breakpointCols={{
            default: 3,
            1100: 2,
            700: 2,
            500: 1,
          }}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
          <MasonryCardSkeleton />
        </Masonry>
      );
    } else {
      if (!isEmpty(bookmarksList)) {
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
            {orderBy(bookmarksList, ['id'], ['desc'])?.map((item, index) => {
              return (
                <div
                  key={item?.id}
                  className="rounded-lg drop-shadow-custom-1 relative group"
                >
                  <a href={item?.url} target="_blank" rel="noreferrer">
                    <figure>
                      <img
                        src={item?.ogImage}
                        alt="bookmark-img"
                        // style={{ height: index % 2 ? 'auto' : '300px' }}
                        className="rounded-lg w-full"
                      />
                    </figure>
                    <div className="items-center space-x-1 hidden group-hover:flex absolute bottom-[8px] right-[10px]">
                      {/* <TrashIcon
                        onClick={(e) => {
                          e.preventDefault();
                          onDeleteClick(item);
                        }}
                        className="h-5 w-5 ml-1 text-red-400 cursor-pointer"
                      /> */}
                      {showAvatar && (
                        <Avatar
                          name={item?.user_id}
                          size="20"
                          round={true}
                          className="mr-1"
                        />
                      )}
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
                  </a>
                </div>
              );
            })}
          </Masonry>
        );
      } else {
        return <div>No Bookmarks</div>;
      }
    }
  };

  return renderMainCardContent();
};

export default CardSection;
