export const MAIN_TABLE_NAME = 'todos';
export const TAG_TABLE_NAME = 'tags';
export const BOOKMARK_TAGS_TABLE_NAME = 'bookmark_tags';
export const CATEGORIES_TABLE_NAME = 'categories';

// regx

export const URL_PATTERN =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

// api
export const NEXT_API_URL = `${
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://bookmark-tags-git-dev-timelessco.vercel.app'
}/api`;

export const BOOKMARK_SCRAPPER_API = '/bookmarkScrapper';
export const GET_BOOKMARKS_DATA_API = '/getBookmarksData';
export const DELETE_BOOKMARK_DATA_API = '/deleteBookmark';
