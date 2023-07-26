import { type NextApiRequest as NextJsApiRequest } from "next";
import {
	type PostgrestError,
	type Session,
	type UserIdentity,
} from "@supabase/supabase-js";

import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
} from "./componentStoreTypes";
import { type CategoryIdUrlTypes, type FileType } from "./componentTypes";

export type SupabaseSessionType = Session | null;

export type ImgMetadataType = {
	height: number | null;
	img_caption: string | null;
	ogImgBlurUrl: string | null;
	width: number | null;
};
export type SingleListData = {
	addedTags: UserTagsData[];
	category_id: number;
	description: string;
	id: number;
	inserted_at: string;
	meta_data: ImgMetadataType;
	ogImage: string;
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
	images: number;
	trash: number;
	uncategorized: number;
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
	user_id: { email: string; id: string; profile_pic?: string | null };
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
	bookmarks_view?: BookmarkViewDataTypes;
	category_order?: number[];
	email?: string;
	id?: string;
	profile_pic?: string;
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
	session: SupabaseSessionType;
	update_access: boolean;
	url: string;
};

export type AddBookmarkScreenshotPayloadTypes = {
	id: number;
	session: SupabaseSessionType;
	url: string;
};

export type ClearBookmarksInTrashApiPayloadTypes = {
	session: SupabaseSessionType;
	user_id: string | undefined;
};

export type DeleteDataApiPayload = {
	id: number;
	session: SupabaseSessionType;
};

export type MoveBookmarkToTrashApiPayload = {
	data: SingleListData;
	isTrash: boolean;
	session: SupabaseSessionType;
};

export type AddCategoryToBookmarkApiPayload = {
	bookmark_id: number;
	category_id: number | null;
	session: SupabaseSessionType;
	update_access: boolean;
};

export type AddUserCategoryApiPayload = {
	category_order: number[];
	name: string;
	session: SupabaseSessionType;
	user_id: string;
};

export type DeleteUserCategoryApiPayload = {
	category_id: number;
	category_order: number[];
	session: SupabaseSessionType;
};

export type UpdateCategoryOrderApiPayload = {
	order: number[];
	session: SupabaseSessionType;
};

export type UpdateCategoryApiPayload = {
	category_id: number | string | null;
	session: SupabaseSessionType;
	updateData: {
		category_name?: CategoriesData["category_name"];
		category_views?: BookmarkViewDataTypes;
		icon?: string | null;
		icon_color?: CategoriesData["icon_color"];
		is_public?: boolean;
	};
};

export type UpdateUserProfileApiPayload = {
	id: string;
	session: SupabaseSessionType;
	updateData: ProfilesTableTypes;
};

export type GetUserProfilePicPayload = {
	email: string;
	session: SupabaseSessionType;
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
	session: SupabaseSessionType;
	updateData: { category_views?: BookmarkViewDataTypes; edit_access?: boolean };
};

export type AddTagToBookmarkApiPayload = {
	selectedData: BookmarksTagData | BookmarksTagData[];
	session: SupabaseSessionType;
};

export type AddUserTagsApiPayload = {
	session: SupabaseSessionType;
	tagsData: { name: string };
	userData: UserIdentity;
};

export type UploadFileApiPayload = {
	category_id: CategoryIdUrlTypes;
	file: FileType;
	session: SupabaseSessionType;
};

export type DeleteBookmarkPayload = {
	deleteData: Array<{
		id: SingleListData["id"];
		ogImage: SingleListData["ogImage"];
		title: SingleListData["title"];
	}>;
	session: SupabaseSessionType;
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
};
