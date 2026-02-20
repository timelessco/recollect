import { BASE_URL } from "@/site-config";

// Category IDs
export const UNCATEGORIZED_CATEGORY_ID = 0;

// table names
export const MAIN_TABLE_NAME = "everything";
export const TAG_TABLE_NAME = "tags";
export const BOOKMARK_TAGS_TABLE_NAME = "bookmark_tags";
export const BOOKMARK_CATEGORIES_TABLE_NAME = "bookmark_categories";
export const CATEGORIES_TABLE_NAME = "categories";
export const SHARED_CATEGORIES_TABLE_NAME = "shared_categories";
export const PROFILES = "profiles";
export const BOOKMARKS_STORAGE_NAME = "bookmarks";
export const FILES_STORAGE_NAME = "files";
export const USER_PROFILE_STORAGE_NAME = "user_profile";
export const R2_MAIN_BUCKET_NAME =
	process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME;

export const STORAGE_SCRAPPED_IMAGES_PATH =
	BOOKMARKS_STORAGE_NAME + "/public/scrapped_imgs";
export const STORAGE_SCREENSHOT_IMAGES_PATH =
	BOOKMARKS_STORAGE_NAME + "/public/screenshot_imgs";
export const STORAGE_SCREENSHOT_VIDEOS_PATH =
	BOOKMARKS_STORAGE_NAME + "/public/screenshot_videos";
export const STORAGE_FILES_PATH = FILES_STORAGE_NAME + "/public";
export const STORAGE_USER_PROFILE_PATH = USER_PROFILE_STORAGE_NAME + "/public";

// Fallback ogImage for audio bookmarks (no cover art)
export const AUDIO_OG_IMAGE_FALLBACK_URL = `${BASE_URL}/audio-fallback.png`;

// Video upload limits
export const VIDEO_ACCESSIBILITY_TIMEOUT_MS = 5_000;
export const VIDEO_DOWNLOAD_TIMEOUT_MS = 60_000;

// Image download timeout
export const IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000;

// Video download timeout
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

// regx

// Supports any valid TLD (2+ characters)

export const HTTP_PATTERN = /^(https?:\/\/)?/u;
export const URL_PATTERN =
	/^(https?:\/\/)?(www\.)?[\da-z-]+(\.[\da-z-]+)*\.[a-z]{2,}(?::\d{1,5})?(\/\S*)?$/iu;
export const GET_NAME_FROM_EMAIL_PATTERN = /^([^@]*)@/u;
export const GET_HASHTAG_TAG_PATTERN = /#\[[^\]]+\]\([^)]+\)|#[^\s#]+/gu;

export const TAG_MARKUP_REGEX = /#\[(?<display>[^\]]+)\]\([^)]+\)/u;

export const GET_SITE_SCOPE_PATTERN = /@([A-Za-z\d]+)/gu;
export const EMAIL_CHECK_PATTERN =
	// eslint-disable-next-line no-useless-escape, regexp/no-useless-escape,
	/^[\w\-\.]+@([\w-]+\.)+[\w-]{2,4}$/gu;
// eslint-disable-next-line unicorn/better-regex, require-unicode-regexp
export const LETTERS_NUMBERS_CHECK_PATTERN = /^[a-z\d]+$/;
export const DISPLAY_NAME_CHECK_PATTERN = /^[\d\sA-Za-z]+$/u;
export const URL_IMAGE_CHECK_PATTERN =
	/^http[^?]*.(jpg|jpeg|gif|png|tiff|bmp|webp|pdf|mp3|mp4)(\?(.*))?$/gimu;
// eslint-disable-next-line require-unicode-regexp, unicorn/better-regex
export const FILE_NAME_PARSING_PATTERN = /[!"'()*+:@~^]/g;
export const URL_PDF_CHECK_PATTERN = /https?:\/\/\S+?\.pdf(\?\S*)?(#\S*)?/iu;

export const ESCAPE_REGEXP_PATTERN = /[$()*+.?[\\\]^{|}]/gu;

// api constants
export const getBaseUrl = () => BASE_URL;

export const NEXT_API_URL = `/api`;

// URL helper functions
export const PREVIEW_PATH = "/preview";

export const PAGINATION_LIMIT = 25;

// this api is to get the media type of the url
export const GET_MEDIA_TYPE_API = "/v1/bookmarks/get/get-media-type";
// this api is to get the pdf buffer
export const GET_PDF_BUFFER_API = "/v1/bookmarks/get/get-pdf-buffer";

// auth api
// no auth api yet
// bookmark api
export const FETCH_BOOKMARKS_DATA_API = "/bookmark/fetch-bookmarks-data";
export const FETCH_BOOKMARK_BY_ID_API = "/v1/bookmarks/get/fetch-by-id?id=";
export const DELETE_BOOKMARK_DATA_API = "/bookmark/delete-bookmark";
export const ADD_BOOKMARK_MIN_DATA = "/bookmark/add-bookmark-min-data";
export const ADD_URL_SCREENSHOT_API = "/bookmark/add-url-screenshot";

export const FETCH_BOOKMARKS_DISCOVERABLE_API =
	"/bookmark/fetch-bookmarks-discoverable";
export const FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API =
	"/bookmark/fetch-discoverable-by-id";
export const WORKER_SCREENSHOT_API = "/v1/screenshot";
export const AI_ENRICHMENT_API = "/v1/ai-enrichment";
export const MOVE_BOOKMARK_TO_TRASH_API = "/bookmark/move-bookmark-to-trash";
export const CLEAR_BOOKMARK_TRASH_API = "/bookmark/clear-bookmark-trash";
export const FETCH_BOOKMARKS_VIEW = "/bookmark/fetch-bookmarks-view";
export const SEARCH_BOOKMARKS = "/bookmark/search-bookmarks";
export const FETCH_BOOKMARKS_COUNT = "/bookmark/fetch-bookmarks-count";
export const ADD_REMAINING_BOOKMARK_API =
	"/bookmark/add-remaining-bookmark-data";

export const TOGGLE_BOOKMARK_DISCOVERABLE_API =
	"/bookmark/toggle-discoverable-on-bookmark";
export const FETCH_PUBLIC_BOOKMARK_BY_ID_API =
	"/api/bookmark/fetch-public-bookmark-by-id";

/**
 * Max bookmark count to SSR on public category page; rest virtualize after hydrate.
 */
export const PUBLIC_PAGE_SSR_ITEM_LIMIT = 24;

// tags api
export const FETCH_USER_TAGS_API = "/tags/fetch-user-tags";
export const ADD_TAG_TO_BOOKMARK_API = "/tags/add-tag-to-bookmark";
export const REMOVE_TAG_FROM_BOOKMARK_API = "/tags/remove-tag-from-bookmark";
export const CREATE_AND_ASSIGN_TAG_API = "/tags/create-and-assign-tag";
// category api
export const FETCH_USER_CATEGORIES_API = "/category/fetch-user-categories";
export const CREATE_USER_CATEGORIES_API = "/category/create-user-category";
export const DELETE_USER_CATEGORIES_API = "/category/delete-user-category";
export const UPDATE_USER_CATEGORIES_API = "/category/update-user-category";
export const UPDATE_CATEGORY_ORDER_API = "/category/update-category-order";
export const SET_BOOKMARK_CATEGORIES_API = "/category/set-bookmark-categories";
export const ADD_CATEGORY_TO_BOOKMARK_API =
	"/category/add-category-to-bookmark";
export const ADD_CATEGORY_TO_BOOKMARKS_API =
	"/category/add-category-to-bookmarks";
export const REMOVE_CATEGORY_FROM_BOOKMARK_API =
	"/category/remove-category-from-bookmark";
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
export const SEND_EMAIL = "/share/send-email";
// profiles api
export const FETCH_USER_PROFILE_API = "/profiles/fetch-user-profile";
export const UPDATE_USER_PROFILE_API = "/profiles/update-user-profile";
export const FETCH_USER_PROFILE_PIC_API = "/profiles/fetch-user-profile-pic";
export const UPDATE_USERNAME_API = "/profiles/update-username";
export const DELETE_USER_API = "/profiles/delete-user";
export const REMOVE_PROFILE_PIC_API = "/profiles/remove-profile-pic";
export const TOGGLE_PREFERRED_OG_DOMAIN_API =
	"/profiles/toggle-preferred-og-domain";

// settings profile api
export const UPLOAD_PROFILE_PIC_API = "/settings/upload-profile-pic";

// file upload api
export const UPLOAD_FILE_API = "/file/upload-file";
export const UPLOAD_FILE_REMAINING_DATA_API =
	"/file/upload-file-remaining-data";

// user settings and keys
export const SAVE_API_KEY_API = "/v1/api-key";

export const CHECK_API_KEY_API = "/v1/check-gemini-api-key";
export const GET_API_KEY_API = "/v1/get-gemini-api-key";

export const DELETE_API_KEY_API = "/v1/delete-api-key";

// Screenshot api
export const SCREENSHOT_API =
	"https://vercel-puppeteer-screenshot-api.vercel.app";

export const RAINDROP_IMPORT_API = "/raindrop/import";

// urls

// Guest
export const LOGIN_URL = "login";
export const EMAIL_URL = "email";
export const OTP_URL = "otp";
export const AUTH_URLS = "auth";

// Others
export const EVERYTHING_URL = "everything";
export const UNCATEGORIZED_URL = "uncategorized";
export const DISCOVER_URL = "discover";
export const SEARCH_URL = "search";
export const INBOX_URL = "inbox";
export const TRASH_URL = "trash";
export const DOCUMENTS_URL = "documents";
export const TWEETS_URL = "tweets";
export const INSTAGRAM_URL = "instagram";
export const SETTINGS_URL = "settings";
export const SIGNUP_URL = "signup";
export const SIGNIN_URL = "login";
export const IMAGES_URL = "images";
export const VIDEOS_URL = "videos";
export const LINKS_URL = "links";
export const AUDIO_URL = "audios";

/**
 * Page slugs that have their own view state (bookmarksView, sortBy, etc.) in profiles.bookmarks_view.
 * Discover uses the everything view.
 */
export const PAGE_VIEW_SLUGS = [
	EVERYTHING_URL,
	IMAGES_URL,
	VIDEOS_URL,
	DOCUMENTS_URL,
	LINKS_URL,
	TWEETS_URL,
	INSTAGRAM_URL,
	AUDIO_URL,
] as const;

export type PageViewSlug = (typeof PAGE_VIEW_SLUGS)[number];

// react-query keys

export const BOOKMARKS_KEY = "bookmarks";
export const BOOKMARKS_COUNT_KEY = "bookmarks_count";
export const PUBLIC_BOOKMARKS_KEY = "public-bookmarks";
export const CATEGORIES_KEY = "categories";
export const USER_TAGS_KEY = "userTags";
export const BOOKMARKS_VIEW = "bookmarks_view";
export const USER_PROFILE = "user_profile";
export const USER_PROFILE_PIC = "user_profile_pic";
export const API_KEY_CHECK_KEY = "api_key_check";
export const GET_API_KEY_KEY = "get_api_key";
export const IMPORT_BOOKMARKS_MUTATION_KEY = "import-bookmarks";

// error msgs

export const ADD_UPDATE_BOOKMARK_ACCESS_ERROR =
	"You dont have access to add to this category, this bookmark will be added without a category";
export const DUPLICATE_CATEGORY_NAME_ERROR =
	"You already have a category with this name. Please use a different name.";
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
	"audio/mp3",

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
	"application/pdf",
];

export const bookmarkType = "bookmark";
export const tweetType = "tweet";

export const instagramType = "instagram";

export const imageFileTypes = acceptedFileTypes?.filter((item) =>
	item?.includes("image"),
);

export const videoFileTypes = acceptedFileTypes?.filter((item) =>
	item?.includes("video"),
);

export const audioFileTypes = acceptedFileTypes?.filter((item) =>
	item?.includes("audio"),
);

export const documentFileTypes = acceptedFileTypes?.filter((item) =>
	item?.includes("application"),
);

// color picker colors
export const colorPickerColors = [
	"#ffffff",
	"#000000",

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
	everything: "Everything",
	discover: "Discover",
	inbox: "Inbox",
	trash: "Trash",
	settings: "Settings",
	image: "Image",
	videos: "Videos",
	links: "Links",
	documents: "Documents",
	tweets: "Tweets",
	instagram: "Instagram",
	audio: "Audio",
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
	"pin.it",
	"myntra",
];

// Lightbox Constants

// Media type prefixes
export const IMAGE_TYPE_PREFIX = "image";
export const VIDEO_TYPE_PREFIX = "video";

export const LINK_TYPE_PREFIX = "text";

// Media type specific strings
export const PDF_MIME_TYPE = "application/pdf";
export const PDF_TYPE = "pdf";
export const IMAGE_JPEG_MIME_TYPE = "image/jpeg";

// UI strings
export const PREVIEW_ALT_TEXT = "preview";

// URL patterns
export const YOUTUBE_COM = "youtube.com";
export const YOUTU_BE = "youtu.be";

// PDF viewer parameters
export const PDF_VIEWER_PARAMS =
	"#toolbar=0&navpanes=0&scrollbar=0&zoom=100&page=1&view=FitH";

// Lightbox button types
export const LIGHTBOX_CLOSE_BUTTON = "close";
export const LIGHTBOX_SHOW_PANE_BUTTON = "show-pane";
export const CF_IMAGE_LOADER_URL = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL}/cdn-cgi/image`;

export const SKIP_OG_IMAGE_DOMAINS = [
	"amazon.in",
	"twitter.com",
	"x.com",
	"amazon.com",
];

export const springConfig = {
	mass: 1,
	damping: 17,
	stiffness: 250,
	overshootClamping: false,
	restSpeedThreshold: 0.001,
	restDisplacementThreshold: 0.001,
	type: "spring",
} as const;

/**
 * Array of guest paths that require authentication
 */
export const GUEST_PATHS = new Set([
	`/${EMAIL_URL}`,
	`/${LOGIN_URL}`,
	`/${OTP_URL}`,
]);
export const isGuestPath = (pathname: string) =>
	pathname.startsWith(`/${AUTH_URLS}`) || GUEST_PATHS.has(pathname);

/**
 * Array of public paths that don't require authentication
 */
const PUBLIC_PATHS = [
	"/api-docs",
	"/discover",
	"/error",
	"/openapi.json",
	"/public",
] as const;
export const isPublicPath = (pathname: string) =>
	PUBLIC_PATHS.some((path) => pathname.startsWith(path));

export const MAX_TAG_COLLECTION_NAME_LENGTH = 20;
export const MIN_TAG_COLLECTION_NAME_LENGTH = 1;
export const WHITE_COLOR = colorPickerColors[0];
export const BLACK_COLOR = colorPickerColors[1];

// Queue names (sync with SQL migrations and Edge Functions)
export const INSTAGRAM_IMPORTS_QUEUE = "instagram_imports";
export const TWITTER_IMPORTS_QUEUE = "twitter_imports";
export const RAINDROP_IMPORTS_QUEUE = "raindrop_imports";
