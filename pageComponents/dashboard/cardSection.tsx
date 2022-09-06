/* eslint-disable @next/next/no-img-element */

import { CategoriesData, SingleListData } from '../../types/apiTypes';
import { PencilAltIcon, TrashIcon } from '@heroicons/react/solid';
import orderBy from 'lodash/orderBy';
import { useRouter } from 'next/router';
import { CATEGORIES_KEY, UNCATEGORIZED_URL } from '../../utils/constants';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import BookmarkCardSkeleton from '../../components/loadersSkeleton/bookmarkCardSkeleton';
import Spinner from '../../components/spinner';
import { useLoadersStore } from '../../store/componentStore';
import Avatar from 'react-avatar';
import { useQueryClient } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';

interface CardSectionProps {
  listData: Array<SingleListData>;
  onDeleteClick: (post: SingleListData) => void;
  onEditClick: (item: SingleListData) => void;
  isLoading: boolean;
  userId: string;
  showAvatar: boolean;
}

const CardSection = ({
  listData = [],
  onDeleteClick,
  onEditClick = () => null,
  isLoading = false,
  userId,
  showAvatar = false,
}: CardSectionProps) => {
  const router = useRouter();
  const category_id = router?.asPath?.split('/')[1] || null;
  const queryClient = useQueryClient();

  const isDeleteBookmarkLoading = useLoadersStore(
    (state) => state.isDeleteBookmarkLoading
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

  return (
    <div className="relative pb-20 lg:pb-28">
      <div className="absolute inset-0">
        <div className="bg-white h-1/3 sm:h-2/3" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="mt-12 max-w-lg mx-auto grid gap-5 lg:grid-cols-3 lg:max-w-none">
          {isLoading ? (
            <>
              <BookmarkCardSkeleton />
              <BookmarkCardSkeleton />
            </>
          ) : (
            <>
              {!isEmpty(bookmarksList) ? (
                <>
                  {orderBy(bookmarksList, ['id'], ['desc']).map((post) => (
                    <div
                      key={post.id}
                      className="flex flex-col rounded-lg shadow-lg overflow-hidden"
                    >
                      <div className="flex-shrink-0">
                        <img
                          className="h-48 w-full object-cover"
                          src={post.ogImage || post.screenshot}
                          alt=""
                        />
                      </div>
                      <div className="flex-1 bg-white p-6 flex justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-indigo-600">
                            <span className="flex space-x-1">
                              {post?.addedTags?.map((tag) => {
                                return <div key={tag?.id}>#{tag?.name}</div>;
                              })}
                            </span>
                          </div>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block mt-2"
                          >
                            <p className="text-xl font-semibold text-gray-900">
                              {post.title}
                            </p>
                            <p className="mt-3 text-base text-gray-500">
                              {post.description}
                            </p>
                          </a>
                        </div>
                        <div className="flex">
                          {showAvatar && (
                            <Avatar
                              name={post?.user_id}
                              size="20"
                              round={true}
                              className="mr-1"
                            />
                          )}
                          {renderEditAndDeleteCondition(post) && (
                            <>
                              <PencilAltIcon
                                className="h-5 w-5 text-gray-400 cursor-pointer"
                                onClick={() => onEditClick(post)}
                              />
                              {!isDeleteBookmarkLoading ? (
                                <TrashIcon
                                  className="h-5 w-5 ml-1 text-gray-400 cursor-pointer"
                                  aria-hidden="true"
                                  onClick={() => onDeleteClick(post)}
                                />
                              ) : (
                                <div>
                                  <Spinner size={15} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-xl font-bold">No Bookmarks</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardSection;
