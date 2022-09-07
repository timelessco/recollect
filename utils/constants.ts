// table names
export const MAIN_TABLE_NAME = 'todos';
export const TAG_TABLE_NAME = 'tags';
export const BOOKMARK_TAGS_TABLE_NAME = 'bookmark_tags';
export const CATEGORIES_TABLE_NAME = 'categories';
export const SHARED_CATEGORIES_TABLE_NAME = 'shared_categories';

export const BOOKMAKRS_STORAGE_NAME = 'bookmarks';

// regx

export const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

// api
export const NEXT_API_URL = `${
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://bookmark-tags-git-collab-dev-timelessco.vercel.app' // :'https://bookmark-tags-git-dev-timelessco.vercel.app'
}/api`;
export const TIMELESS_SCRAPPER_API =
  'https://link-preview-livid-ten.vercel.app/api/getUrlData';
export const SCREENSHOT_API = 'https://s.vercel.app/api?url=';

export const BOOKMARK_SCRAPPER_API = '/bookmarkScrapper';
export const GET_BOOKMARKS_DATA_API = '/getBookmarksData';
export const DELETE_BOOKMARK_DATA_API = '/deleteBookmark';
export const SEND_COLLABORATION_EMAIL_API = '/sendCollaborationEmail';
export const ADD_CATEGORY_TO_BOOKMARK_API = '/add-category-to-bookmark';
export const SYNC_PROFILES_TABLE_API = '/sync-profiles-table';
export const ADD_BOOKMARK_MIN_DATA = '/add-bookmark-min-data';
export const ADD_URL_SCREENSHOT_API = '/add-url-screenshot';

// urls

export const UNCATEGORIZED_URL = 'uncategorized';

// react-query keys

export const BOOKMARKS_KEY = 'bookmarks';
export const CATEGORIES_KEY = 'categories';
export const USER_TAGS_KEY = 'userTags';
