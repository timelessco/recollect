// table names
export const MAIN_TABLE_NAME = "bookmarks_table";
export const TAG_TABLE_NAME = "tags";
export const BOOKMARK_TAGS_TABLE_NAME = "bookmark_tags";
export const CATEGORIES_TABLE_NAME = "categories";
export const SHARED_CATEGORIES_TABLE_NAME = "shared_categories";
export const PROFILES = "profiles";
export const BOOKMAKRS_STORAGE_NAME = "bookmarks";
export const FILES_STORAGE_NAME = "files";

export const STORAGE_SCRAPPED_IMAGES_PATH = "public/scrapped_imgs";

// regx

export const URL_PATTERN =
	// eslint-disable-next-line no-useless-escape, unicorn/no-unsafe-regex
	/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[\da-z]+([.\-][\da-z]+)*\.[a-z]{2,5}(:\d{1,5})?(\/.*)?$/gu;
export const GET_NAME_FROM_EMAIL_PATTERN = /^([^@]*)@/u;
export const GET_TEXT_WITH_AT_CHAR = /[A-Za-z]*@[A-Za-z]*/gu;
export const EMAIL_CHECK_PATTERN =
	// eslint-disable-next-line unicorn/no-unsafe-regex
	/^[\w!#$%&'*+./=?^`{|}~-]+@[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*$/u;

// api constants
const getBaseUrl = () => {
	if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
		return process.env.NEXT_PUBLIC_SITE_URL;
	}

	if (
		process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
		process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
	) {
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
	}

	return "http://localhost:3000";
};

// const getBaseUrl = () =>
// 	"https://bookmark-tags-git-file-upload-feat-timelessco.vercel.app";

export const NEXT_API_URL = `${getBaseUrl()}/api`;
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
export const GET_USER_PROFILE_PIC_API = "/profiles/get-user-profile-pic";
// file upload api
export const UPLOAD_FILE_API = "/file/upload-file";

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
export const IMAGES_URL = "images";

// react-query keys

export const BOOKMARKS_KEY = "bookmarks";
export const BOOKMARKS_COUNT_KEY = "bookmarks_count";
export const CATEGORIES_KEY = "categories";
export const USER_TAGS_KEY = "userTags";
export const BOOKMARKS_VIEW = "bookmarks_view";
export const USER_PROFILE = "user_profile";
export const USER_PROFILE_PIC = "user_profile_pic";

// error msgs

export const ADD_UPDATE_BOOKMARK_ACCESS_ERROR =
	"You dont have access to add to this category, this bookmark will be added without a category";
export const DUPLICATE_CATEGORY_NAME_ERROR =
	"You already have a category with this name , please add anyother name";

// accepted file type constants
export const acceptedFileTypes = [
	"image/jpg",
	"image/jpeg",
	"image/png",
	"video/mp4",
	"video/mov",
	"video/wmv",
	"video/webm",
	"application/pdf",
	"audio/mp3",
	"audio/mpeg",
];

// color picker colors
export const colorPickerColors = [
	"#ffffff",
	"#000000",
	"#F44E3B",
	"#FE9200",
	"#FCDC00",
	"#DBDF00",
];

// blur-hash
export const defaultBlur =
	"data:image/webp;base64,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";
