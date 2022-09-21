import { Menu, Transition } from '@headlessui/react';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Fragment } from 'react';
import Button from '../../components/atoms/button';
import CollectionPlaceholderIcon from '../../icons/collectionPlaceholderIcon';
import DownArrowGray from '../../icons/downArrowGray';
import HomeIconGray from '../../icons/homeIconGray';
import InboxIconGray from '../../icons/inboxIconGray';
import SearchIconGray from '../../icons/searchIconGray';
import TrashIconGray from '../../icons/trashIconGray';
import {
  CategoriesData,
  FetchSharedCategoriesData,
  SingleListData,
} from '../../types/apiTypes';
import { ChildrenTypes } from '../../types/componentTypes';
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  INBOX_URL,
  SEARCH_URL,
  SHARED_CATEGORIES_TABLE_NAME,
  TRASH_URL,
} from '../../utils/constants';

interface DashboardLayoutProps {
  userImg: string;
  userName: string;
  userEmail: string;
  onSignOutClick: () => void;
  onSigninClick: () => void;
  renderMainContent: () => ChildrenTypes;
  onAddCategoryClick: () => void;
  onDeleteCategoryClick: (id: string, current: boolean) => void;
  bookmarksData?: Array<SingleListData>;
  onAddBookmark: (url: string) => void;
  onShareClick: (id: string) => void;
  userId: string;
  isAddInputLoading: boolean;
}

const DashboardLayout = (props: DashboardLayoutProps) => {
  const {
    renderMainContent,
    userImg,
    // userEmail,
    userName,
    onSignOutClick,
    onSigninClick,
    onAddCategoryClick,
    onDeleteCategoryClick,
    onAddBookmark,
    onShareClick,
    userId,
    isAddInputLoading = false,
  } = props;
  const userNavigation = [{ name: 'Sign out', href: '#' }];

  const router = useRouter();
  const queryClient = useQueryClient();

  const currentPath = router.asPath.split('/')[1] || null;

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const bookmarksData = queryClient.getQueryData([BOOKMARKS_KEY, userId]) as {
    data: SingleListData[];
    error: PostgrestError;
  };

  const sharedCategoriesData = queryClient.getQueryData([
    SHARED_CATEGORIES_TABLE_NAME,
  ]) as {
    data: FetchSharedCategoriesData[];
    error: PostgrestError;
  };

  function classNames(...classes: Array<string>) {
    return classes.filter(Boolean).join(' ');
  }

  const renderSidePaneUserDropdown = () => {
    return (
      <>
        {userImg ? (
          <Menu as="div" className="flex-shrink-0 relative">
            <div className="p-1 hover:bg-custom-gray-2 rounded-lg">
              <Menu.Button className="w-full flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <div className="w-6 h-6">
                  <span className="sr-only">Open user menu</span>
                  {userImg && (
                    <Image
                      width={24}
                      height={24}
                      className="h-8 w-8 rounded-full"
                      src={userImg}
                      alt=""
                    />
                  )}
                </div>

                <p className="text-sm font-medium text-custom-gray-1 mx-2 leading-[115%]">
                  {userName}
                </p>
                <DownArrowGray />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none">
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      <div
                        className={` cursor-pointer ${classNames(
                          active ? 'bg-gray-100' : '',
                          'block py-2 px-4 text-sm text-gray-700'
                        )}`}
                        onClick={onSignOutClick}
                      >
                        {item.name}
                      </div>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        ) : (
          <Button onClick={onSigninClick}>Signin</Button>
        )}
      </>
    );
  };

  const optionsMenuList = [
    {
      icon: () => <SearchIconGray />,
      name: 'Search',
      href: `/${SEARCH_URL}`,
      current: false,
    },
    {
      icon: () => <HomeIconGray />,
      name: 'All Bookmarks',
      href: `/`,
      current: !currentPath,
    },
    {
      icon: () => <InboxIconGray />,
      name: 'Inbox',
      href: `/${INBOX_URL}`,
      current: false,
    },
    {
      icon: () => <TrashIconGray />,
      name: 'Trash',
      href: `/${TRASH_URL}`,
      current: false,
    },
  ];

  interface listPropsTypes {
    item: {
      icon: () => ChildrenTypes;
      name: string;
      href: string;
      current: boolean;
    };
  }

  const SingleListItem = (listProps: listPropsTypes) => {
    const { item } = listProps;
    return (
      <Link href={item?.href} passHref={true}>
        <a
          className={`${
            item?.current ? 'bg-custom-gray-2' : 'bg-white'
          } py-[7px] px-2 mt-1 flex items-center hover:bg-custom-gray-2 rounded-lg cursor-pointer`}
        >
          <figure className="w-4 h-4">{item?.icon()}</figure>
          <p className="truncate flex-1 text-sm font-[450] text-custom-gray-1 ml-3 leading-[14px]">
            {item?.name}
          </p>
        </a>
      </Link>
    );
  };
  const renderSidePaneOptionsMenu = () => {
    return (
      <div className="pt-[10px]">
        {optionsMenuList?.map((item, index) => {
          return <SingleListItem key={index} item={item} />;
        })}
      </div>
    );
  };

  const collectionsList = userImg
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
          icon: () => <CollectionPlaceholderIcon />,
        };
      })
    : [];

  const renderSidePaneCollections = () => {
    return (
      <div className="pt-[25px]">
        <p className="font-medium text-[13px] leading-[115%] px-1 text-custom-gray-3">
          Collections
        </p>
        <div className="pt-3">
          {collectionsList?.map((item, index) => {
            return <SingleListItem item={item} key={index} />;
          })}
        </div>
      </div>
    );
  };
  return (
    <div className="flex h-screen bg-white">
      <nav className="min-w-[244px] max-w-[244px] p-2">
        {renderSidePaneUserDropdown()}
        {renderSidePaneOptionsMenu()}
        {renderSidePaneCollections()}
      </nav>
      <div className="bg-gray-200 w-full">main pane</div>
    </div>
  );
};

export default DashboardLayout;
