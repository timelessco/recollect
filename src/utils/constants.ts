import { isProductionEnvironment } from "./supabaseServerClient";

// table names
export const MAIN_TABLE_NAME = "bookmarks_table";
export const TAG_TABLE_NAME = "tags";
export const BOOKMARK_TAGS_TABLE_NAME = "bookmark_tags";
export const CATEGORIES_TABLE_NAME = "categories";
export const SHARED_CATEGORIES_TABLE_NAME = "shared_categories";
export const PROFILES = "profiles";
export const DOCUMENTS_TABLE_NAME = "documents";
export const BOOKMAKRS_STORAGE_NAME = "bookmarks";
export const FILES_STORAGE_NAME = "files";
export const USER_PROFILE_STORAGE_NAME = "user_profile";
export const R2_MAIN_BUCKET_NAME = "recollect";

export const STORAGE_SCRAPPED_IMAGES_PATH =
	BOOKMAKRS_STORAGE_NAME + "/public/scrapped_imgs";
export const STORAGE_SCREENSHOT_IMAGES_PATH =
	BOOKMAKRS_STORAGE_NAME + "/public/screenshot_imgs";
export const STORAGE_FILES_PATH = FILES_STORAGE_NAME + "/public";
export const STORAGE_USER_PROFILE_PATH = USER_PROFILE_STORAGE_NAME + "/public";

// regx

// Supports any valid TLD (2+ characters)
export const URL_PATTERN =
	// eslint-disable-next-line  unicorn/no-unsafe-regex
	/^(https?:\/\/)?(www\.)?[\da-z-]+(\.[\da-z-]+)*\.[a-z]{2,}(?::\d{1,5})?(\/\S*)?$/iu;
export const GET_NAME_FROM_EMAIL_PATTERN = /^([^@]*)@/u;
export const GET_TEXT_WITH_AT_CHAR = /[A-Za-z]*@[A-Za-z]*/gu;
export const EMAIL_CHECK_PATTERN =
	// eslint-disable-next-line unicorn/no-unsafe-regex, unicorn/better-regex, require-unicode-regexp, regexp/strict, regexp/no-useless-escape, no-useless-escape
	/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
// eslint-disable-next-line unicorn/better-regex, require-unicode-regexp
export const LETTERS_NUMBERS_CHECK_PATTERN = /^[a-z\d]+$/;
export const DISPLAY_NAME_CHECK_PATTERN = /^[\d\sA-Za-z]+$/u;
export const URL_IMAGE_CHECK_PATTERN =
	// eslint-disable-next-line unicorn/no-unsafe-regex
	/^http[^?]*.(jpg|jpeg|gif|png|tiff|bmp|webp|pdf|mp3|mp4)(\?(.*))?$/gimu;
// eslint-disable-next-line require-unicode-regexp, unicorn/better-regex
export const FILE_NAME_PARSING_PATTERN = /[!"'()*+:@~^]/g;

// api constants
export const getBaseUrl = () =>
	isProductionEnvironment
		? "https://bookmark-tags-git-feat-local-pdf-thumbnail-timelessco.vercel.app"
		: "http://localhost:3000/";

export const NEXT_API_URL = `/api/`;

const RECOLLECT_SERVER_URL = process.env.RECOLLECT_SERVER_API;
export const OCR_URL = `${RECOLLECT_SERVER_URL}/ocr`;

export const PAGINATION_LIMIT = 25;

// auth api
// no auth api yet
// bookmark api
export const FETCH_BOOKMARKS_DATA_API = "/bookmark/fetch-bookmarks-data";
export const DELETE_BOOKMARK_DATA_API = "/bookmark/delete-bookmark";
export const ADD_BOOKMARK_MIN_DATA = "/bookmark/add-bookmark-min-data";
export const ADD_URL_SCREENSHOT_API = "/bookmark/add-url-screenshot";
export const MOVE_BOOKMARK_TO_TRASH_API = "/bookmark/move-bookmark-to-trash";
export const CLEAR_BOOKMARK_TRASH_API = "/bookmark/clear-bookmark-trash";
export const FETCH_BOOKMARKS_VIEW = "/bookmark/fetch-bookmarks-view";
export const SEARCH_BOOKMARKS = "/bookmark/search-bookmarks";
export const FETCH_BOOKMARKS_COUNT = "/bookmark/fetch-bookmarks-count";
export const ADD_REMAINING_BOOKMARK_API =
	"/bookmark/add-remaining-bookmark-data";

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
export const FETCH_PUBLIC_CATEGORY_BOOKMARKS_API =
	"/fetch-public-category-bookmarks";
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
export const FETCH_USER_PROFILE_PIC_API = "/profiles/fetch-user-profile-pic";
export const UPDATE_USERNAME_API = "/profiles/update-username";
export const DELETE_USER_API = "/profiles/delete-user";
export const REMOVE_PROFILE_PIC_API = "/profiles/remove-profile-pic";

// settings profile api
export const UPLOAD_PROFILE_PIC_API = "/settings/upload-profile-pic";

// file upload api
export const UPLOAD_FILE_API = "/file/upload-file";
export const UPLOAD_FILE_REMAINING_DATA_API =
	"/file/upload-file-remaining-data";

// ai apis
export const EMBEDDINGS_POST_API = "/v1/ai/embeddings/post";
export const EMBEDDINGS_DELETE_API = "/v1/ai/embeddings/delete";
export const AI_SEARCH_API = "/v1/ai/search/get";

// Screenshot api
export const SCREENSHOT_API =
	"https://vercel-puppeteer-screenshot-api.vercel.app/";
export const SCREENSHOT_URL =
	"https://media.recollect.so/bookmarks/public/screenshot_imgs";

// urls
export const ALL_BOOKMARKS_URL = "all-bookmarks";
export const UNCATEGORIZED_URL = "uncategorized";
export const SEARCH_URL = "search";
export const INBOX_URL = "inbox";
export const TRASH_URL = "trash";
export const DOCUMENTS_URL = "documents";
export const TWEETS_URL = "tweets";
export const SETTINGS_URL = "settings";
export const LOGIN_URL = "login";
export const SIGNUP_URL = "signup";
export const SIGNIN_URL = "login";
export const IMAGES_URL = "images";
export const VIDEOS_URL = "videos";
export const LINKS_URL = "links";

// react-query keys

export const BOOKMARKS_KEY = "bookmarks";
export const BOOKMARKS_COUNT_KEY = "bookmarks_count";
export const CATEGORIES_KEY = "categories";
export const USER_TAGS_KEY = "userTags";
export const BOOKMARKS_VIEW = "bookmarks_view";
export const USER_PROFILE = "user_profile";
export const USER_PROFILE_PIC = "user_profile_pic";
export const AI_SEARCH_KEY = "ai_search";

// error msgs

export const ADD_UPDATE_BOOKMARK_ACCESS_ERROR =
	"You dont have access to add to this category, this bookmark will be added without a category";
export const DUPLICATE_CATEGORY_NAME_ERROR =
	"You already have a category with this name , please add any other name";
export const NO_BOOKMARKS_ID_ERROR = "Bookmark ID is required";

// accepted file type constants
export const acceptedFileTypes = [
	// Image
	"image/gif",
	"image/vnd.microsoft.icon",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/svg+xml",
	"image/tiff",
	"image/webp",
	"image/apng",
	"image/avif",
	"image/bmp",

	// Audio
	"audio/midi",
	"audio/x-midi",
	"audio/mpeg",
	"audio/ogg",
	"audio/3gpp",
	"audio/3gpp2",
	"audio/webm",
	"audio/wav",
	"audio/aac",

	// Video
	"video/mp4",
	"video/mpeg",
	"video/ogg",
	"video/mp2t",
	"video/webm",
	"video/3gpp",
	"video/3gpp2",
	"video/x-msvideo",

	// Application
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-fontobject",
	"application/epub+zip",
	"application/gzip",
	"application/x-gzip",
	"application/java-archive",
	"application/json",
	"application/ld+json",
	"application/vnd.apple.installer+xml",
	"application/vnd.oasis.opendocument.presentation",
	"application/vnd.oasis.opendocument.spreadsheet",
	"application/vnd.oasis.opendocument.text",
	"application/ogg",
	"application/pdf",
	"application/x-httpd-php",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.rar",
	"application/rtf",
	"application/x-sh",
	"application/x-tar",
	"application/manifest+json",
	"application/xhtml+xml",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/xml",
	"text/xml",
	"application/vnd.mozilla.xul+xml",
	"application/zip",
	"application/x-zip-compressed",
	"application/x-7z-compressed",
	"application/x-abiword",
	"application/x-freearc",
	"application/vnd.amazon.ebook",
	"application/octet-stream",
	"application/x-bzip",
	"application/x-bzip2",
	"application/x-cdf",
	"application/x-csh",
];

export const bookmarkType = "bookmark";
export const tweetType = "tweet";

export const imageFileTypes = acceptedFileTypes?.filter(
	(item) => item?.includes("image"),
);

export const videoFileTypes = acceptedFileTypes?.filter(
	(item) => item?.includes("video"),
);

export const documentFileTypes = acceptedFileTypes?.filter(
	(item) => item?.includes("application"),
);

// color picker colors
export const colorPickerColors = [
	"#ffffff",
	"#1a1a1a",

	"#ff2d5f",
	"#ff339b",
	"#ea35f7",
	"#a14fff",
	"#5a46fa",

	"#0082ff",
	"#00a9ef",
	"#00b0ff",
	"#00bec9",
	"#00bc7b",

	"#00cb49",
	"#6ccf00",
	"#f4b100",
	"#ff9900",
	"#ff6800",

	"#ff2a39",
	"#d2b24d",
	"#ce8849",
	"#003468",
];

// blur-hash
// cspell:disable-next-line -- disables checking till the end of the next line.
export const defaultBlur = "Uf4:~MrTiwbcpfi]Z~kDb_agaJoco}jbaeax";

export const menuListItemName = {
	allBookmarks: "All Bookmarks",
	inbox: "Inbox",
	trash: "Trash",
	settings: "Settings",
	image: "Image",
	videos: "Videos",
	links: "Links",
	documents: "Documents",
	tweets: "Tweets",
};

// if user is adding anything in these pages then the added item will be in uncategorized
export const uncategorizedPages = [
	UNCATEGORIZED_URL,
	LINKS_URL,
	VIDEOS_URL,
	DOCUMENTS_URL,
	IMAGES_URL,
];

export const viewValues = {
	timeline: "timeline",
	moodboard: "moodboard",
	card: "card",
	list: "list",
	headlines: "headlines",
};

export const singleInfoValues = {
	title: "title",
	cover: "cover",
	info: "info",
	description: "description",
	tags: "tags",
};

export const infoValues = [
	singleInfoValues.title,
	singleInfoValues.cover,
	singleInfoValues.info,
	singleInfoValues.description,
	singleInfoValues.tags,
];

// pathnames

export const CATEGORY_ID_PATHNAME = `/[category_id]`;

// OG_IMAGE_PREFERRED_SITES
export const OG_IMAGE_PREFERRED_SITES = [
	"cosmos",
	"pinterest",
	"savee.it",
	"are.na",
	"medium",
	"spotify",
	"imdb",
];
