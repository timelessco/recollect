import React, { Fragment, useState } from 'react';
import { Dialog, Menu, Transition, Disclosure } from '@headlessui/react';
import {
  BellIcon,
  FolderIcon,
  HomeIcon,
  MenuAlt2Icon,
  XIcon,
  InboxIcon,
  PlusCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';
import { TrashIcon } from '@heroicons/react/solid';
import { ChildrenTypes, UrlInput } from '../../types/componentTypes';
import Button from '../../components/atoms/button';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { CategoriesData, SingleListData } from '../../types/apiTypes';
import { PostgrestError } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  UNCATEGORIZED_URL,
  URL_PATTERN,
} from '../../utils/constants';
import { getCountInCategory, urlInputErrorText } from '../../utils/helpers';
import { SubmitHandler, useForm } from 'react-hook-form';
import { isEmpty } from 'lodash';

interface SideBarNavidationTypes {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentClass<any>;
  current: boolean;
  href: string;
  children: Array<{ name: string; href: string; id: string; current: boolean }>;
  count?: number;
}

const userNavigation = [{ name: 'Sign out', href: '#' }];

function classNames(...classes: Array<string>) {
  return classes.filter(Boolean).join(' ');
}

interface DashboardLayoutProps {
  userImg: string;
  userName: string;
  userEmail: string;
  onSignOutClick: () => void;
  onSigninClick: () => void;
  renderMainContent: () => ChildrenTypes;
  onAddCategoryClick: () => void;
  onDeleteCategoryClick: (id: string) => void;
  bookmarksData?: Array<SingleListData>;
  onAddBookmark: (url: string) => void;
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  const {
    renderMainContent,
    userImg,
    // userEmail,
    // userName,
    onSignOutClick,
    onSigninClick,
    onAddCategoryClick,
    onDeleteCategoryClick,
    onAddBookmark,
  } = props;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlInput>();
  const onSubmit: SubmitHandler<UrlInput> = (data) => {
    onAddBookmark(data.urlText);
    reset({ urlText: '' });
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentPath = router.asPath.split('/')[1] || null;

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const bookmarksData = queryClient.getQueryData([BOOKMARKS_KEY, null]) as {
    data: SingleListData[];
    error: PostgrestError;
  };

  const navigation = [
    {
      name: 'All Bookmarks',
      icon: HomeIcon,
      current: !currentPath,
      href: '/',
    },
    {
      name: 'Uncategorized',
      icon: InboxIcon,
      current: currentPath === UNCATEGORIZED_URL,
      href: `/${UNCATEGORIZED_URL}`,
      count: getCountInCategory(null, bookmarksData?.data),
    },
    {
      name: 'Categories',
      icon: FolderIcon,
      current: false,
      href: '/',
      children: categoryData?.data?.map((item) => {
        return {
          name: item?.category_name,
          href: `/${item?.category_slug}`,
          id: item?.id,
          current: currentPath === item?.category_slug,
        };
      }),
    },
  ] as unknown as Array<SideBarNavidationTypes>;

  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-gray-100">
        <body class="h-full">
        ```
      */}
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-40 md:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 flex z-40">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="flex-shrink-0 flex items-center px-4">
                    <p>B</p>
                  </div>
                  <div className="mt-5 flex-1 h-0 overflow-y-auto">
                    <nav className="px-2 space-y-1">
                      {navigation.map((item) =>
                        !item.children ? (
                          <div key={item.name}>
                            <a
                              href="#"
                              className={classNames(
                                item.current
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                'group w-full flex items-center pl-2 py-2 text-sm font-medium rounded-md'
                              )}
                            >
                              <item.icon
                                className={classNames(
                                  item.current
                                    ? 'text-gray-500'
                                    : 'text-gray-400 group-hover:text-gray-500',
                                  'mr-3 flex-shrink-0 h-6 w-6'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </a>
                          </div>
                        ) : (
                          <Disclosure
                            as="div"
                            key={item.name}
                            className="space-y-1"
                          >
                            {({ open }) => (
                              <>
                                <Disclosure.Button
                                  className={classNames(
                                    item.current
                                      ? 'bg-gray-100 text-gray-900'
                                      : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                    'group w-full flex items-center pl-2 pr-1 py-2 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                  )}
                                >
                                  <item.icon
                                    className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500"
                                    aria-hidden="true"
                                  />
                                  <span className="flex-1">{item.name}</span>
                                  <svg
                                    className={classNames(
                                      open
                                        ? 'text-gray-400 rotate-90'
                                        : 'text-gray-300',
                                      'ml-3 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150'
                                    )}
                                    viewBox="0 0 20 20"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M6 6L14 10L6 14V6Z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                </Disclosure.Button>
                                <Disclosure.Panel className="space-y-1">
                                  {item.children.map((subItem) => (
                                    <Disclosure.Button
                                      key={subItem.name}
                                      as="a"
                                      href={subItem.href}
                                      className={`${
                                        item?.current ? 'bg-gray-800' : ''
                                      } group w-full flex items-center pl-11 pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50`}
                                    >
                                      {subItem.name}
                                    </Disclosure.Button>
                                  ))}
                                  <Disclosure.Button>
                                    Add Category
                                  </Disclosure.Button>
                                </Disclosure.Panel>
                              </>
                            )}
                          </Disclosure>
                        )
                      )}
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="flex-shrink-0 w-14" aria-hidden="true">
                {/* Dummy element to force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              {/* <img
                className="h-8 w-auto"
                src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg"
                alt="Workflow"
              /> */}
              <a href="#">
                <p className="text-2xl">Bookmarks</p>
              </a>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav
                className="flex-1 px-2 space-y-1 bg-white"
                aria-label="Sidebar"
              >
                {/* desktop */}
                {navigation.map((item) =>
                  !item.children ? (
                    <div key={item.name}>
                      <Link href={item?.href} passHref={true}>
                        <a
                          className={classNames(
                            item.current
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            'group w-full flex items-center pl-2 py-2 text-sm font-medium rounded-md'
                          )}
                        >
                          <item.icon
                            className={classNames(
                              item.current
                                ? 'text-gray-500'
                                : 'text-gray-400 group-hover:text-gray-500',
                              'mr-3 flex-shrink-0 h-6 w-6'
                            )}
                            aria-hidden="true"
                          />
                          <div className="flex">
                            {item.name}
                            {item?.count !== undefined ? (
                              <span
                                className={classNames(
                                  'bg-gray-200 group-hover:bg-gray-200',
                                  'ml-3 inline-block py-0.5 px-3 text-xs font-medium rounded-full'
                                )}
                              >
                                {item?.count}
                              </span>
                            ) : null}
                          </div>
                        </a>
                      </Link>
                    </div>
                  ) : (
                    <Disclosure
                      as="div"
                      key={item.name}
                      className="space-y-1"
                      defaultOpen={true}
                    >
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            className={classNames(
                              item.current
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                              'group w-full flex items-center pl-2 pr-1 py-2 text-left text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
                            )}
                          >
                            <item.icon
                              className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500"
                              aria-hidden="true"
                            />
                            <span className="flex-1">{item.name}</span>
                            <svg
                              className={classNames(
                                open
                                  ? 'text-gray-400 rotate-90'
                                  : 'text-gray-300',
                                'ml-3 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150'
                              )}
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path
                                d="M6 6L14 10L6 14V6Z"
                                fill="currentColor"
                              />
                            </svg>
                          </Disclosure.Button>
                          <Disclosure.Panel className="space-y-1">
                            {item.children.map((subItem) => (
                              <Link
                                href={subItem.href}
                                passHref={true}
                                key={subItem.name}
                              >
                                <Disclosure.Button
                                  key={subItem.name}
                                  as="a"
                                  className={`${
                                    subItem?.current
                                      ? 'bg-gray-100 text-gray-900'
                                      : ''
                                  } justify-between group w-full flex items-center pl-11 pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50`}
                                >
                                  <div className="flex">
                                    {subItem.name}
                                    <span
                                      className={classNames(
                                        item.current
                                          ? 'bg-white'
                                          : 'bg-gray-200 group-hover:bg-gray-200',
                                        'ml-3 inline-block py-0.5 px-3 text-xs font-medium rounded-full'
                                      )}
                                    >
                                      {getCountInCategory(
                                        subItem?.id,
                                        bookmarksData?.data
                                      )}
                                    </span>
                                  </div>
                                  <TrashIcon
                                    onClick={() =>
                                      onDeleteCategoryClick(subItem.id)
                                    }
                                    className="flex-shrink-0 h-4 w-4 text-red-400 hover:text-red-500 hidden group-hover:block"
                                  />
                                </Disclosure.Button>
                              </Link>
                            ))}
                            <button
                              className=" relative group w-full flex items-center pl-11 pr-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50"
                              onClick={onAddCategoryClick}
                            >
                              <PlusCircleIcon className=" absolute left-3 top-1.5 mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                              <span>Add Category</span>
                            </button>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  )
                )}
              </nav>
            </div>
          </div>
        </div>
        <div className="md:pl-64 flex flex-col flex-1">
          <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <MenuAlt2Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <form
                  className="w-full flex md:ml-0"
                  onSubmit={handleSubmit(onSubmit)}
                >
                  <label htmlFor="search-field" className="sr-only">
                    Search
                  </label>
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                    <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                      {!isEmpty(errors) ? (
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <PlusCircleIcon
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <input
                      {...register('urlText', {
                        required: true,
                        pattern: URL_PATTERN,
                      })}
                      type="text"
                      placeholder="Add URL"
                      className={`${
                        isEmpty(errors)
                          ? 'text-gray-900 placeholder-gray-500 focus:placeholder-gray-400'
                          : 'text-red-600 placeholder-red-300 focus:placeholder-red-400'
                      } block w-full h-full pl-8 pr-3 py-2 border-transparent  focus:outline-none focus:ring-0 focus:border-transparent sm:text-sm`}
                    />
                    {!isEmpty(errors) && (
                      <div className="mt-2 text-sm text-red-600">
                        {urlInputErrorText(errors)}
                      </div>
                    )}
                  </div>
                </form>
              </div>
              <div className="ml-4 flex items-center md:ml-6 space-x-1">
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                {/* Profile dropdown */}
                {userImg ? (
                  <Menu as="div" className="flex-shrink-0 relative ml-5">
                    <div>
                      <Menu.Button className="bg-white rounded-full flex focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <span className="sr-only">Open user menu</span>
                        {userImg && (
                          <Image
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full"
                            src={userImg}
                            alt=""
                          />
                        )}
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
                      <Menu.Items className="origin-top-right absolute z-10 right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none">
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
              </div>
            </div>
          </div>

          <main className="flex-1">
            <div className="py-6">
              {/* <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <h1 className="text-2xl font-semibold text-gray-900">
                  All Bookmarks
                </h1>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="py-4">{renderMainContent()}</div>
              </div> */}
              {renderMainContent()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
