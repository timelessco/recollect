// table names
export const MAIN_TABLE_NAME = "bookmarks_table";
export const TAG_TABLE_NAME = "tags";
export const BOOKMARK_TAGS_TABLE_NAME = "bookmark_tags";
export const CATEGORIES_TABLE_NAME = "categories";
export const SHARED_CATEGORIES_TABLE_NAME = "shared_categories";
export const PROFILES = "profiles";
export const BOOKMAKRS_STORAGE_NAME = "bookmarks";

// regx

export const URL_PATTERN =
  // eslint-disable-next-line no-useless-escape
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
export const GET_NAME_FROM_EMAIL_PATTERN = /^([^@]*)@/;
export const GET_TEXT_WITH_AT_CHAR = /[a-zA-Z]*@[a-zA-Z]*/g;
export const EMAIL_CHECK_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

// api constants
export const NEXT_API_URL = `${
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://bookmark-tags-git-ts-migration-timelessco.vercel.app" // :'https://bookmark-tags-git-dev-timelessco.vercel.app'
}/api`;
export const TIMELESS_SCRAPPER_API =
  "https://link-preview-livid-ten.vercel.app/api/getUrlData";
export const SCREENSHOT_API = "https://s.vercel.app/api?url=";
export const PAGINATION_LIMIT = 25;

// auth api
// no auth api yet
// bookmark api
export const GET_BOOKMARKS_DATA_API = "/bookmark/get-bookmarks-data";
export const DELETE_BOOKMARK_DATA_API = "/bookmark/delete-bookmark";
export const ADD_BOOKMARK_MIN_DATA = "/bookmark/add-bookmark-min-data";
export const ADD_URL_SCREENSHOT_API = "/bookmark/add-url-screenshot";
export const MOVE_BOOKMARK_TO_TRASH_API = "/bookmark/move-bookmark-to-trash";
export const CLEAR_BOOKMARK_TRASH_API = "/bookmark/clear-bookmark-trash";
export const FETCH_BOOKMARKS_VIEW = "/bookmark/fetch-bookmarks-view";
export const SEARCH_BOOKMARKS = "/bookmark/search-bookmarks";
export const GET_BOOKMARKS_COUNT = "/bookmark/get-bookmarks-count";

// tags api
export const FETCH_USER_TAGS_API = "/tags/fetch-user-tags";
export const CREATE_USER_TAGS_API = "/tags/create-user-tags";
export const ADD_TAG_TO_BOOKMARK_API = "/tags/add-tag-to-bookmark";
export const REMOVE_TAG_FROM_BOOKMARK_API = "/tags/remove-tag-from-bookmark";
// category api
export const FETCH_USER_CATEGORIES_API = "/category/fetch-user-categories";
export const CREATE_USER_CATEGORIES_API = "/category/create-user-category";
export const ADD_CATEGORY_TO_BOOKMARK_API =
  "/category/add-category-to-bookmark";
export const DELETE_USER_CATEGORIES_API = "/category/delete-user-category";
export const UPDATE_USER_CATEGORIES_API = "/category/update-user-category";
export const UPDATE_CATEGORY_ORDER_API = "/category/update-category-order";
// share api
export const GET_PUBLIC_CATEGORY_BOOKMARKS_API =
  "/get-public-category-bookmarks";
// collab share api
export const FETCH_SHARED_CATEGORIES_DATA_API =
  "/share/fetch-shared-categories-data";
export const UPDATE_SHARED_CATEGORY_USER_ROLE_API =
  "/share/update-shared-category-user-role";
export const DELETE_SHARED_CATEGORIES_USER_API =
  "/share/delete-shared-categories-user";
export const SEND_COLLABORATION_EMAIL_API = "/share/send-collaboration-email";
// profiles api
export const FETCH_USER_PROFILE_API = "/profiles/fetch-user-profile";
export const UPDATE_USER_PROFILE_API = "/profiles/update-user-profile";

// urls
export const ALL_BOOKMARKS_URL = "all-bookmarks";
export const UNCATEGORIZED_URL = "uncategorized";
export const SEARCH_URL = "search";
export const INBOX_URL = "inbox";
export const TRASH_URL = "trash";
export const SETTINGS_URL = "settings";
export const LOGIN_URL = "login";
export const SIGNUP_URL = "signup";
export const SIGNIN_URL = "login";

// react-query keys

export const BOOKMARKS_KEY = "bookmarks";
export const BOOKMARKS_COUNT_KEY = "bookmarks_count";
export const CATEGORIES_KEY = "categories";
export const USER_TAGS_KEY = "userTags";
export const BOOKMARKS_VIEW = "bookmarks_view";
export const USER_PROFILE = "user_profile";

// error msgs

export const ADD_UPDATE_BOOKMARK_ACCESS_ERROR =
  "You dont have access to add to this category, this bookmark will be added without a category";
export const DUPLICATE_CATEGORY_NAME_ERROR =
  "You already have a category with this name , please add anyother name";
