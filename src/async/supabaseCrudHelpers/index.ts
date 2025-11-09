import { GoogleGenerativeAI } from "@google/generative-ai";
import { type Provider, type SupabaseClient } from "@supabase/supabase-js";
import {
	type QueryFunctionContext,
	type QueryKey,
} from "@tanstack/react-query";
import axios from "axios";
import { isNil } from "lodash";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import {
	type AddBookmarkMinDataPayloadTypes,
	type AddBookmarkScreenshotPayloadTypes,
	type AddCategoryToBookmarkApiPayload,
	type AddTagToBookmarkApiPayload,
	type AddUserTagsApiPayload,
	type BookmarksCountTypes,
	type BookmarksPaginatedDataTypes,
	type BookmarkViewDataTypes,
	type CategoriesData,
	type DeleteBookmarkPayload,
	type DeleteUserCategoryApiPayload,
	type FetchDataResponse,
	type FetchSharedCategoriesData,
	type GetUserProfilePicPayload,
	type MoveBookmarkToTrashApiPayload,
	type ProfilesTableTypes,
	type RemoveUserProfilePicPayload,
	type SingleListData,
	type SupabaseSessionType,
	type UpdateCategoryApiPayload,
	type UpdateCategoryOrderApiPayload,
	type UpdateSharedCategoriesUserAccessApiPayload,
	type UpdateUsernameApiPayload,
	type UpdateUserProfileApiPayload,
	type UploadFileApiPayload,
	type UploadFileApiResponse,
	type UploadProfilePicApiResponse,
	type UploadProfilePicPayload,
	type UserProfilePicTypes,
	type UserTagsData,
} from "../../types/apiTypes";
import { type BookmarksSortByTypes } from "../../types/componentStoreTypes";
import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import {
	ADD_BOOKMARK_MIN_DATA,
	ADD_CATEGORY_TO_BOOKMARK_API,
	ADD_TAG_TO_BOOKMARK_API,
	ADD_URL_SCREENSHOT_API,
	ALL_BOOKMARKS_URL,
	CHECK_API_KEY_API,
	CLEAR_BOOKMARK_TRASH_API,
	CREATE_USER_CATEGORIES_API,
	CREATE_USER_TAGS_API,
	DELETE_API_KEY_API,
	DELETE_BOOKMARK_DATA_API,
	DELETE_SHARED_CATEGORIES_USER_API,
	DELETE_USER_API,
	DELETE_USER_CATEGORIES_API,
	FETCH_BOOKMARK_BY_ID_API,
	FETCH_BOOKMARKS_COUNT,
	FETCH_BOOKMARKS_DATA_API,
	FETCH_BOOKMARKS_VIEW,
	FETCH_SHARED_CATEGORIES_DATA_API,
	FETCH_USER_CATEGORIES_API,
	FETCH_USER_PROFILE_API,
	FETCH_USER_PROFILE_PIC_API,
	FETCH_USER_TAGS_API,
	GET_MEDIA_TYPE_API,
	getBaseUrl,
	MOVE_BOOKMARK_TO_TRASH_API,
	NEXT_API_URL,
	NO_BOOKMARKS_ID_ERROR,
	PAGINATION_LIMIT,
	REMOVE_PROFILE_PIC_API,
	REMOVE_TAG_FROM_BOOKMARK_API,
	SAVE_API_KEY_API,
	SEARCH_BOOKMARKS,
	SEND_COLLABORATION_EMAIL_API,
	UPDATE_CATEGORY_ORDER_API,
	UPDATE_SHARED_CATEGORY_USER_ROLE_API,
	UPDATE_USER_CATEGORIES_API,
	UPDATE_USER_PROFILE_API,
	UPDATE_USERNAME_API,
	UPLOAD_FILE_API,
	UPLOAD_PROFILE_PIC_API,
} from "../../utils/constants";
import { isUserInACategory, parseUploadFileName } from "../../utils/helpers";

// bookmark
// get bookmark by id
export const fetchBookmarkById = async (id: string) => {
	try {
		if (!id) {
			throw new Error(NO_BOOKMARKS_ID_ERROR);
		}

		const response = await axios.get<{ data: SingleListData }>(
			`${NEXT_API_URL}${FETCH_BOOKMARK_BY_ID_API}${id}`,
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

// user settings and keys
export const saveApiKey = async ({
	apikey,
}: {
	apikey: string;
}): Promise<{ data: unknown; message: string }> => {
	try {
		const response = await axios.post<{ data: unknown; message: string }>(
			`${NEXT_API_URL}${SAVE_API_KEY_API}`,
			{ apikey },
		);

		return response?.data;
	} catch {
		throw new Error("Invalid API key");
	}
};

export const deleteApiKey = async (): Promise<{
	data: unknown;
	message: string;
}> => {
	try {
		const response = await axios.delete<{ data: unknown; message: string }>(
			`${NEXT_API_URL}${DELETE_API_KEY_API}`,
		);

		return response?.data;
	} catch {
		throw new Error("Failed to delete API key");
	}
};

type CheckApiKeyResponse = { data: { hasApiKey: boolean } };

export const checkApiKey = async (): Promise<CheckApiKeyResponse> => {
	try {
		const response = await axios.get(`${NEXT_API_URL}${CHECK_API_KEY_API}`);

		if (!response.data) {
			throw new Error("Failed to check API key status");
		}

		return response.data;
	} catch (error) {
		console.error("Error checking API key:", error);
		throw new Error("Failed to verify API key status");
	}
};

// bookmark
// gets bookmarks data
export const fetchBookmakrsData = async (
	{
		pageParam: pageParameter = 0,
		queryKey,
	}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
	QueryFunctionContext<Array<number | string | null | undefined>, any>,
	session: SupabaseSessionType,
	sortBy: BookmarksSortByTypes,
) => {
	const categoryId =
		!isEmpty(queryKey) && queryKey?.length <= 4 ? queryKey[2] : null;

	const userId =
		!isEmpty(queryKey) && queryKey?.length <= 5 ? queryKey[1] : null;

	if (!userId) {
		return { data: [], error: null, count: {} } as unknown as FetchDataResponse;
	}

	if (!session?.user) {
		return undefined;
	}

	if (!sortBy) {
		return undefined;
	}

	try {
		const bookmarksData = await axios.get<{
			count: BookmarksCountTypes;
			data: { data: SingleListData[] };
		}>(
			`${NEXT_API_URL}${FETCH_BOOKMARKS_DATA_API}?category_id=${
				isNull(categoryId) ? "null" : categoryId
			}&from=${pageParameter as string}&sort_by=${sortBy}`,
		);

		return {
			data: bookmarksData?.data?.data,
			error: null,
			count: bookmarksData?.data?.count,
		} as unknown as FetchDataResponse;
	} catch (error) {
		return { data: undefined, error } as unknown as FetchDataResponse;
	}
};

export const getBookmarksCount = async (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	queryData: QueryFunctionContext<QueryKey, any>,
	session: SupabaseSessionType,
): Promise<{ data: BookmarksCountTypes | null; error: Error }> => {
	const userId =
		!isEmpty(queryData?.queryKey) && queryData?.queryKey?.length < 4
			? queryData?.queryKey[1]
			: undefined;

	if (!session?.user) {
		return {
			data: null,
			error: { name: "No user session", message: "No user session" },
		};
	}

	if (userId) {
		try {
			const bookmarksData = await axios.get<{
				data: BookmarksCountTypes;
				error: Error;
			}>(`${NEXT_API_URL}${FETCH_BOOKMARKS_COUNT}`);

			return bookmarksData?.data;
		} catch (error_) {
			const error = error_ as Error;
			return { data: null, error };
		}
	} else {
		// return undefined;
		return { data: null, error: { name: "NO user id", message: "NO user id" } };
	}
};

export const addBookmarkMinData = async ({
	url,
	category_id,
	update_access,
}: AddBookmarkMinDataPayloadTypes) => {
	try {
		// append https here
		let finalUrl = url;

		if (!url.startsWith("http") || !url.startsWith("https")) {
			finalUrl = `https://${url}`;
		}

		const apiResponse = await axios.post(
			`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`,
			{
				url: finalUrl,
				category_id: isNull(category_id) ? 0 : category_id,
				update_access,
			},
		);

		return apiResponse as { data: { data: SingleListData[] } };
	} catch (error) {
		return error;
	}
};

export const addBookmarkScreenshot = async ({
	url,
	id,
}: AddBookmarkScreenshotPayloadTypes) => {
	try {
		const apiResponse = await axios.post(
			`${NEXT_API_URL}${ADD_URL_SCREENSHOT_API}`,
			{ url, id },
		);

		return apiResponse;
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
			throw new Error(error.message);
		}

		return error;
	}
};

export const deleteData = async (item: DeleteBookmarkPayload) => {
	try {
		const response = await axios.post(
			`${getBaseUrl()}${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`,
			{ data: { deleteData: item?.deleteData } },
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const moveBookmarkToTrash = async ({
	data,
	isTrash,
}: MoveBookmarkToTrashApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${MOVE_BOOKMARK_TO_TRASH_API}`,
			{ data, isTrash },
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const clearBookmarksInTrash = async () => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${CLEAR_BOOKMARK_TRASH_API}`,
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const searchBookmarks = async (
	searchText: string,
	category_id: CategoryIdUrlTypes,
	isSharedCategory: boolean,
	offset = 0,
	limit = PAGINATION_LIMIT,
): Promise<{
	data: BookmarksPaginatedDataTypes[] | null;
	error: Error | null;
}> => {
	if (!isEmpty(searchText) && searchText !== "#") {
		const categoryId = !isNull(category_id) ? category_id : "null";

		try {
			const response = await axios.get<{
				data: BookmarksPaginatedDataTypes[];
				error: Error | null;
			}>(
				`${NEXT_API_URL}${SEARCH_BOOKMARKS}?search=${searchText}&category_id=${categoryId}&is_shared_category=${isSharedCategory}&offset=${offset}&limit=${limit}`,
			);
			return response?.data;
		} catch (error_) {
			const error = error_ as Error;
			return { data: null, error };
		}
	}

	return {
		data: null,
		error: { name: "error", message: "No search text provided" },
	};
};

// user tags
export const fetchUserTags = async (): Promise<{
	data: UserTagsData[] | null;
	error: Error;
}> => {
	try {
		const response = await axios.get<{ data: UserTagsData[]; error: Error }>(
			`${NEXT_API_URL}${FETCH_USER_TAGS_API}`,
		);
		return response?.data;
	} catch (error_) {
		const error = error_ as Error;
		return { data: null, error };
	}
};

export const addUserTags = async ({ tagsData }: AddUserTagsApiPayload) => {
	try {
		const response = await axios.post<{ data: UserTagsData }>(
			`${NEXT_API_URL}${CREATE_USER_TAGS_API}`,
			{ name: tagsData?.name },
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const addTagToBookmark = async ({
	selectedData,
}: AddTagToBookmarkApiPayload) => {
	try {
		const response = await axios.post<{ data: SingleListData }>(
			`${NEXT_API_URL}${ADD_TAG_TO_BOOKMARK_API}`,
			{ data: selectedData },
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const removeTagFromBookmark = async ({
	selectedData,
}: {
	selectedData: { bookmark_id: number; tag_id: number };
}) => {
	try {
		const response = await axios.post<{ data: UserTagsData; error: Error }>(
			`${NEXT_API_URL}${REMOVE_TAG_FROM_BOOKMARK_API}`,
			{ tag_id: selectedData?.tag_id, bookmark_id: selectedData?.bookmark_id },
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const fetchBookmarksViews = async ({
	category_id,
}: {
	category_id: number | string | null;
}): Promise<{ data: BookmarkViewDataTypes | null; error: Error }> => {
	if (!isUserInACategory(category_id as string)) {
		return {
			data: null,
			error: { message: "user not in category", name: "user not in category" },
		};
	}

	if (isNull(category_id)) {
		return {
			data: null,
			error: {
				message: "no access token and category id is null",
				name: "no access token and category id is nul",
			},
		};
	}

	try {
		const response = await axios.post<{
			data: BookmarkViewDataTypes | null;
			error: Error;
		}>(`${NEXT_API_URL}${FETCH_BOOKMARKS_VIEW}`, {
			category_id: isNull(category_id) ? 0 : category_id,
		});
		return response?.data;
	} catch (error_) {
		const error = error_ as Error;
		return { data: null, error };
	}
};

// user categories

export const fetchCategoriesData = async (): Promise<{
	data: CategoriesData[] | null;
	error: Error;
}> => {
	try {
		const response = await axios.get<{
			data: CategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${FETCH_USER_CATEGORIES_API}`);

		return response.data;
	} catch (error_) {
		const error = error_ as Error;
		return { data: null, error };
	}
};

export const addUserCategory = async ({
	name,
	category_order,
}: {
	category_order: number[];
	name: string;
}) => {
	try {
		const response = await axios.post<{
			data: CategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${CREATE_USER_CATEGORIES_API}`, {
			name,
			category_order,
		});
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const deleteUserCategory = async ({
	category_id,
	category_order,
}: DeleteUserCategoryApiPayload) => {
	try {
		const response = await axios.post<{
			data: CategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_USER_CATEGORIES_API}`, {
			category_id,
			category_order,
		});
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const addCategoryToBookmark = async ({
	category_id,
	bookmark_id,
	update_access = false,
}: AddCategoryToBookmarkApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
			{
				category_id: isNull(category_id) || !category_id ? 0 : category_id,
				bookmark_id,
				update_access,
			},
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const updateCategory = async ({
	category_id,
	updateData,
}: UpdateCategoryApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${UPDATE_USER_CATEGORIES_API}`,
			{ category_id, updateData },
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const updateCategoryOrder = async ({
	order,
}: UpdateCategoryOrderApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${UPDATE_CATEGORY_ORDER_API}`,
			{ category_order: order },
		);

		return response;
	} catch (error) {
		return error;
	}
};

// share
export const sendCollaborationEmailInvite = async ({
	emailList,
	category_id,
	edit_access,
	hostUrl,
}: {
	category_id: number;
	edit_access: boolean;
	emailList: string[];
	hostUrl: string;
}) => {
	const response = await axios.post(
		`${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`,
		{ emailList, category_id, edit_access, hostUrl },
	);

	return response;
};

export const fetchSharedCategoriesData = async (): Promise<{
	data: FetchSharedCategoriesData[] | null;
	error: Error;
}> => {
	try {
		const response = await axios.get<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${FETCH_SHARED_CATEGORIES_DATA_API}`);

		return response?.data;
	} catch (error) {
		const catchError = error as Error;
		return { data: null, error: catchError };
	}
};

export const deleteSharedCategoriesUser = async ({ id }: { id: number }) => {
	try {
		const response = await axios.post<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_SHARED_CATEGORIES_USER_API}`, { id });

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const updateSharedCategoriesUserAccess = async ({
	id,
	updateData,
}: UpdateSharedCategoriesUserAccessApiPayload) => {
	try {
		const response = await axios.post<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_SHARED_CATEGORY_USER_ROLE_API}`, {
			id,
			updateData,
		});

		return response?.data;
	} catch (error) {
		return error;
	}
};

// profiles
export const fetchUserProfiles = async ({
	userId,
	session,
}: {
	session: SupabaseSessionType;
	userId: string;
}): Promise<{ data: ProfilesTableTypes[] | null; error: Error }> => {
	const existingOauthAvatarUrl = session?.user?.user_metadata?.avatar_url;

	try {
		if (userId) {
			const response = await axios.get<{
				data: ProfilesTableTypes[] | null;
				error: Error;
			}>(
				`${NEXT_API_URL}${FETCH_USER_PROFILE_API}?${
					!isNil(existingOauthAvatarUrl)
						? `&avatar=${existingOauthAvatarUrl}`
						: ``
				}`,
			);
			return response?.data;
		}

		return { data: null, error: { name: "No user id", message: "No user id" } };
	} catch (error_) {
		const error = error_ as Error;
		return { data: null, error };
	}
};

export const updateUserProfile = async ({
	updateData,
}: UpdateUserProfileApiPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, { updateData });

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const updateUsername = async ({
	id,
	username,
}: UpdateUsernameApiPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_USERNAME_API}`, { id, username });

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const deleteUser = async () => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_USER_API}`, {});

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const getUserProfilePic = async ({
	email,
}: GetUserProfilePicPayload): Promise<{
	data: UserProfilePicTypes[] | null;
	error: Error;
}> => {
	if (!isNil(email) && !isEmpty(email)) {
		try {
			const response = await axios.get<{
				data: UserProfilePicTypes[] | null;
				error: Error;
			}>(`${NEXT_API_URL}${FETCH_USER_PROFILE_PIC_API}?email=${email}`);

			return response?.data;
		} catch (error) {
			return { data: null, error: error as Error };
		}
	}

	return { data: null, error: "Email not present" as unknown as Error };
};

export const removeUserProfilePic = async ({
	id,
}: RemoveUserProfilePicPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${REMOVE_PROFILE_PIC_API}`, { id });

		return response?.data;
	} catch (error) {
		return error;
	}
};

// file upload

export const uploadFile = async ({
	file,
	category_id,
	thumbnailPath,
	uploadFileNamePath,
}: UploadFileApiPayload) => {
	try {
		const fileName = parseUploadFileName(file?.name);
		const response = await axios.post<UploadFileApiResponse>(
			`${NEXT_API_URL}${UPLOAD_FILE_API}`,
			{
				category_id,
				thumbnailPath,
				name: fileName,
				type: file?.type,
				uploadFileNamePath,
			},
			{ headers: { "Content-Type": "application/json" } },
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

// user settings
export const uploadProfilePic = async ({ file }: UploadProfilePicPayload) => {
	try {
		const response = await axios.post<UploadProfilePicApiResponse>(
			`${NEXT_API_URL}${UPLOAD_PROFILE_PIC_API}`,
			{ file },
			{ headers: { "Content-Type": "multipart/form-data" } },
		);

		return response?.data;
	} catch (error) {
		return error;
	}
};

// auth

export const signInWithOauth = async (
	provider: Provider,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	await supabase.auth.signInWithOAuth({ provider });
};

export const signInWithOtp = async (
	email: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	const { data, error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			shouldCreateUser: true,
			emailRedirectTo: `${getBaseUrl()}/${ALL_BOOKMARKS_URL}`,
		},
	});

	return { data, error };
};

export const verifyOtp = async (
	email: string,
	otp: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	const { data, error } = await supabase.auth.verifyOtp({
		email,
		token: otp,
		type: "email",
	});
	return { data, error };
};

export const signUpWithEmailPassword = async (
	email: string,
	password: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	const { error } = await supabase.auth.signUp({ email, password });

	return { error };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
	await supabase.auth.signOut({ scope: "local" });
};

export const getMediaType = async (url: string): Promise<string | null> => {
	try {
		const encodedUrl = encodeURIComponent(url);

		const response = await fetch(
			`${getBaseUrl()}${NEXT_API_URL}${GET_MEDIA_TYPE_API}?url=${encodedUrl}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			console.error("Error in getting media type");
			return null;
		}

		const data = await response.json();

		return data.mediaType || null;
	} catch (error) {
		console.error("Error getting media type:", error);
		return null;
	}
};

export const validateApiKey = async (apikey: string) => {
	try {
		const genAI = new GoogleGenerativeAI(apikey);
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

		const prompt = "Hey there!";
		const result = await model.generateContent([prompt]);

		if (!result.response.text()) {
			throw new Error("response not generated");
		}

		return result;
	} catch {
		throw new Error("Invalid API key");
	}
};
