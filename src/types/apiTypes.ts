import { type NextApiRequest as NextJsApiRequest } from "next";
import { type PostgrestError, type User } from "@supabase/supabase-js";

import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
} from "./componentStoreTypes";
import { type CategoryIdUrlTypes, type FileType } from "./componentTypes";

export type SupabaseSessionType = { user: User | null };
export type CookiesType = Partial<{ [key: string]: string }>;
export type ImgMetadataType = {
	coverImage: string | null;
	favIcon: string | null;
	height: number | null;
	iframeAllowed: boolean | null;
	img_caption: string | null;
	isOgImagePreferred: boolean;
	isPageScreenshot: boolean | null;
	mediaType: string;
	ocr: string | null;
	ogImgBlurUrl: string | null;
	screenshot: string | null;
	twitter_avatar_url: string | null;
	video_url: string | null;
	width: number | null;
};

export type twitter_sort_index = string;

export type SingleListData = {
	addedTags: UserTagsData[];
	category_id: number | null;
	description: string;
	id: number;
	inserted_at: string;
	meta_data: ImgMetadataType;
	ogImage: string;
	ogimage: string;
	screenshot: string;
	title: string;
	trash: boolean;
	type: string;
	url: string;
	user_id: ProfilesTableTypes;
};

export type BookmarksCountTypes = {
	allBookmarks: number;
	categoryCount: Array<{ category_id: number; count: number }>;
	documents: number;
	images: number;
	links: number;
	trash: number;
	tweets: number;
	uncategorized: number;
	videos: number;
};

export type SingleBookmarksPaginatedDataTypes = {
	count: BookmarksCountTypes;
	data: SingleListData[];
	error: PostgrestError;
};
export type BookmarksPaginatedDataTypes = {
	pages: SingleBookmarksPaginatedDataTypes[];
};

export type FetchDataResponse<T = SingleListData[]> = {
	data: T;
	error: PostgrestError | null;
};

export type UrlData = {
	description: string;
	id?: number;
	ogImage: string;
	screenshot: string;
	title: string;
	url: string;
	user_id: string;
};

export type UserTagsData = {
	bookmark_tag_id: number;
	created_at: string;
	id: number;
	name: string;
	user_id: string;
};

export type FetchUserTagsDataResponse = {
	data: UserTagsData[];
	error: PostgrestError | null;
};

export type BookmarksTagData = {
	bookmark_id: number;
	bookmark_tag_id: number;
	created_at?: string;
	id?: number;
	tag_id: number;
	user_id: string;
};

export type FetchBookmarksTagDataResponse = {
	data: BookmarksTagData[];
	error: PostgrestError | null;
};

export type BookmarkViewDataTypes = {
	bookmarksView: BookmarksViewTypes;
	cardContentViewArray: string[];
	moodboardColumns: number[];
	sortBy: BookmarksSortByTypes;
};

// user catagories

export type CategoriesData = {
	category_name: string;
	category_slug: string;
	category_views: BookmarkViewDataTypes;
	collabData: CollabDataInCategory[] | [];
	created_at: string;
	icon: string | null;
	icon_color: string;
	id: number;
	is_public: boolean;
	user_id: ProfilesTableTypes;
};

export type FetchCategoriesDataResponse = {
	data: CategoriesData[];
	error: PostgrestError | null;
};

// shared categories
export type FetchSharedCategoriesData = {
	category_id: number;
	category_views: BookmarkViewDataTypes;
	created_at: string;
	edit_access: boolean;
	// email: {
	//   email: string;
	//   profile_pic: string | null;
	// };
	email: string;
	id: number;
	is_accept_pending: boolean;
	user_id: string;
};

export type CollabDataInCategory = {
	edit_access: boolean;
	// it will be null for owner
	isOwner: boolean;
	is_accept_pending: boolean;
	profile_pic: string | null;
	share_id: number | null;
	userEmail: string;
};

// profiles table

export type ProfilesTableTypes = {
	bookmarks_view: BookmarkViewDataTypes;
	category_order: number[];
	display_name: string;
	email: string;
	id: string;
	profile_pic: string;
	provider: string | null;
	user_name: string;
};

export type ProfilesTableForPayloadTypes = {
	bookmarks_view?: BookmarkViewDataTypes;
	category_order?: number[];
	display_name?: string;
	email?: string;
	id?: string;
	profile_pic?: string;
	provider?: ProfilesTableTypes["provider"];
	user_name?: string;
};

export type BookmarksWithTagsWithTagForginKeys = Array<{
	bookmark_id: number;
	tag_id: { id: number; name: string };
}>;

export type UserProfilePicTypes = {
	profile_pic: string | null;
};

// file upload

export type UploadFileApiResponse = {
	data?: Array<{ id: SingleListData["id"] } | null> | null;
	error: Error | PostgrestError | string | null;
	success: boolean;
};

// settings

export type UploadProfilePicApiResponse = {
	error: Error | PostgrestError | string | null;
	success: boolean;
};

// NEXT API types
export type NextApiRequest<T> = Omit<NextJsApiRequest, "body"> & {
	body: T & { access_token: string };
};

// CRUD types

export type AddBookmarkMinDataPayloadTypes = {
	category_id: number | string | null;
	update_access: boolean;
	url: string;
};

export type AddBookmarkRemainingDataPayloadTypes = {
	favIcon: string;
	id: SingleListData["id"];
	url: SingleListData["url"];
	user_id: SingleListData["user_id"]["id"];
};

export type AddBookmarkScreenshotPayloadTypes = {
	id: number;
	url: string;
};

export type ClearBookmarksInTrashApiPayloadTypes = {};

export type DeleteDataApiPayload = {
	id: number;
	session: SupabaseSessionType;
};

export type MoveBookmarkToTrashApiPayload = {
	data: SingleListData;
	isTrash: boolean;
};

export type AddCategoryToBookmarkApiPayload = {
	bookmark_id: number;
	category_id: number | null;
	update_access: boolean;
};

export type AddUserCategoryApiPayload = {
	category_order: number[];
	name: string;
	session: SupabaseSessionType;
};

export type DeleteUserCategoryApiPayload = {
	category_id: number;
	category_order: number[];
};

export type UpdateCategoryOrderApiPayload = {
	order: number[];
};

export type UpdateCategoryApiPayload = {
	category_id: number | string | null;
	updateData: {
		category_name?: CategoriesData["category_name"];
		category_views?: BookmarkViewDataTypes;
		icon?: string | null;
		icon_color?: CategoriesData["icon_color"];
		is_public?: boolean;
	};
};

export type UpdateUserProfileApiPayload = {
	updateData: ProfilesTableForPayloadTypes;
};

export type UpdateUsernameApiPayload = {
	id: string;
	username: ProfilesTableTypes["user_name"];
};

export type DeleteUserApiPayload = {};

export type RemoveUserProfilePicPayload = {
	id: string;
};

export type GetUserProfilePicPayload = {
	email: string;
};

export type DeleteSharedCategoriesUserApiPayload = {
	id: number;
	session: SupabaseSessionType;
};

export type SendCollaborationEmailInviteApiPayload = {
	category_id: number;
	edit_access: boolean;
	emailList: string[];
	hostUrl: string;
	session: SupabaseSessionType;
	userId: string;
};

export type UpdateSharedCategoriesUserAccessApiPayload = {
	id: number;
	updateData: { category_views?: BookmarkViewDataTypes; edit_access?: boolean };
};

export type AddTagToBookmarkApiPayload = {
	selectedData: BookmarksTagData | BookmarksTagData[];
};

export type AddUserTagsApiPayload = {
	tagsData: { name: string };
};

export type UploadFileApiPayload = {
	category_id: CategoryIdUrlTypes;
	file: FileType;
	thumbnailPath: string | null;
	// this is the path where the file in uploaded storage
	uploadFileNamePath: string;
};

export type DeleteBookmarkPayload = {
	deleteData: Array<{
		id: SingleListData["id"];
		meta_data: SingleListData["meta_data"];
		ogImage: SingleListData["ogImage"];
		title: SingleListData["title"];
		url: SingleListData["url"];
	}>;
};

export type UploadProfilePicPayload = {
	file: FileType;
};

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | string | null;

export type GetPublicCategoryBookmarksApiResponseType = {
	category_name: CategoriesData["category_name"] | null;
	category_views: BookmarkViewDataTypes | null;
	data: DataResponse;
	error: ErrorResponse;
	icon: CategoriesData["icon"] | null;
	icon_color: CategoriesData["icon_color"] | null;
	is_public: CategoriesData["is_public"] | null;
};

// common types used in next js API

export type FileNameType = string | undefined;

export type ParsedFormDataType = {
	fields: {
		category_id?: string;
		name?: string;
		thumbnailPath?: UploadFileApiPayload["thumbnailPath"];
		type?: string;
		uploadFileNamePath?: string;
		user_id?: string;
	};
	files: {
		file?: Array<{
			filepath?: string;
			mimetype: string;
			originalFilename?: FileNameType;
		}>;
	};
};
