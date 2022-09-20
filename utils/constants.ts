// table names
export const MAIN_TABLE_NAME = 'bookmarks_table';
export const TAG_TABLE_NAME = 'tags';
export const BOOKMARK_TAGS_TABLE_NAME = 'bookmark_tags';
export const CATEGORIES_TABLE_NAME = 'categories';
export const SHARED_CATEGORIES_TABLE_NAME = 'shared_categories';

export const BOOKMAKRS_STORAGE_NAME = 'bookmarks';

// regx

export const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
export const GET_NAME_FROM_EMAIL_PATTERN = /^([^@]*)@/;

// api
export const NEXT_API_URL = `${
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://bookmark-tags-git-dev-timelessco.vercel.app' // :'https://bookmark-tags-git-dev-timelessco.vercel.app'
}/api`;
export const TIMELESS_SCRAPPER_API =
  'https://link-preview-livid-ten.vercel.app/api/getUrlData';
export const SCREENSHOT_API = 'https://s.vercel.app/api?url=';

export const BOOKMARK_SCRAPPER_API = '/bookmarkScrapper';
export const GET_BOOKMARKS_DATA_API = '/get-bookmarks-data';
export const DELETE_BOOKMARK_DATA_API = '/delete-bookmark';
export const SEND_COLLABORATION_EMAIL_API = '/send-collaboration-email';
export const SYNC_PROFILES_TABLE_API = '/sync-profiles-table';
export const ADD_BOOKMARK_MIN_DATA = '/add-bookmark-min-data';
export const ADD_URL_SCREENSHOT_API = '/add-url-screenshot';
// tags api
export const FETCH_USER_TAGS_API = '/fetch-user-tags';
export const CREATE_USER_TAGS_API = '/create-user-tags';
export const ADD_TAG_TO_BOOKMARK_API = '/add-tag-to-bookmark';
export const REMOVE_TAG_FROM_BOOKMARK_API = '/remove-tag-from-bookmark';
// category api
export const FETCH_USER_CATEGORIES_API = '/fetch-user-categories';
export const CREATE_USER_CATEGORIES_API = '/create-user-category';
export const ADD_CATEGORY_TO_BOOKMARK_API = '/add-category-to-bookmark';
export const DELETE_USER_CATEGORIES_API = '/delete-user-category';
export const UPDATE_USER_CATEGORIES_API = '/update-user-category';
// share api
export const GET_PUBLIC_CATEGORY_BOOKMARKS_API =
  '/get-public-category-bookmarks';
// collab share api
export const FETCH_SHARED_CATEGORIES_DATA_API = '/fetch-shared-categories-data';
export const UPDATE_SHARED_CATEGORY_USER_ROLE_API =
  '/update-shared-category-user-role';
export const DELETE_SHARED_CATEGORIES_USER_API =
  '/delete-shared-categories-user';

// urls
export const UNCATEGORIZED_URL = 'uncategorized';

// react-query keys

export const BOOKMARKS_KEY = 'bookmarks';
export const CATEGORIES_KEY = 'categories';
export const USER_TAGS_KEY = 'userTags';
