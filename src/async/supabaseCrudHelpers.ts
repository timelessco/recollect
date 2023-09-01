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
	type ClearBookmarksInTrashApiPayloadTypes,
	type DeleteBookmarkPayload,
	type DeleteUserApiPayload,
	type DeleteUserCategoryApiPayload,
	type FetchDataResponse,
	type FetchSharedCategoriesData,
	type GetUserProfilePicPayload,
	type MoveBookmarkToTrashApiPayload,
	type ProfilesTableTypes,
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
} from "../types/apiTypes";
import { type CategoryIdUrlTypes } from "../types/componentTypes";
import {
	ADD_BOOKMARK_MIN_DATA,
	ADD_CATEGORY_TO_BOOKMARK_API,
	ADD_TAG_TO_BOOKMARK_API,
	ADD_URL_SCREENSHOT_API,
	CLEAR_BOOKMARK_TRASH_API,
	CREATE_USER_CATEGORIES_API,
	CREATE_USER_TAGS_API,
	DELETE_BOOKMARK_DATA_API,
	DELETE_SHARED_CATEGORIES_USER_API,
	DELETE_USER_API,
	DELETE_USER_CATEGORIES_API,
	FETCH_BOOKMARKS_VIEW,
	FETCH_SHARED_CATEGORIES_DATA_API,
	FETCH_USER_CATEGORIES_API,
	FETCH_USER_PROFILE_API,
	FETCH_USER_TAGS_API,
	GET_BOOKMARKS_COUNT,
	GET_BOOKMARKS_DATA_API,
	GET_USER_PROFILE_PIC_API,
	MOVE_BOOKMARK_TO_TRASH_API,
	NEXT_API_URL,
	REMOVE_TAG_FROM_BOOKMARK_API,
	SEARCH_BOOKMARKS,
	SEND_COLLABORATION_EMAIL_API,
	UPDATE_CATEGORY_ORDER_API,
	UPDATE_SHARED_CATEGORY_USER_ROLE_API,
	UPDATE_USER_CATEGORIES_API,
	UPDATE_USER_PROFILE_API,
	UPDATE_USERNAME_API,
	UPLOAD_FILE_API,
	UPLOAD_PROFILE_PIC_API,
} from "../utils/constants";
import { isUserInACategory } from "../utils/helpers";

// bookmark
// gets bookmarks data
export const fetchBookmakrsData = async (
	{
		pageParam: pageParameter = 0,
		queryKey,
	}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
	QueryFunctionContext<Array<number | string | null | undefined>, any>,
	session: SupabaseSessionType,
) => {
	const categoryId =
		!isEmpty(queryKey) && queryKey?.length <= 3 ? queryKey[2] : null;

	const userId =
		!isEmpty(queryKey) && queryKey?.length <= 4 ? queryKey[1] : null;

	if (!userId) {
		return {
			data: [],
			error: null,
			count: {},
		} as unknown as FetchDataResponse;
	}

	if (!session?.access_token) {
		return undefined;
	}

	try {
		const bookmarksData = await axios.get<{
			count: BookmarksCountTypes;
			data: {
				data: SingleListData[];
			};
		}>(
			`${NEXT_API_URL}${GET_BOOKMARKS_DATA_API}?access_token=${
				session?.access_token
			}&category_id=${isNull(categoryId) ? "null" : categoryId}&from=${
				pageParameter as string
			}`,
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
): Promise<{
	data: BookmarksCountTypes | null;
	error: Error;
}> => {
	const userId =
		!isEmpty(queryData?.queryKey) && queryData?.queryKey?.length < 4
			? queryData?.queryKey[1]
			: undefined;

	if (!session?.access_token) {
		return {
			data: null,
			error: { name: "No access Token", message: "No Access token" },
		};
	}

	if (userId) {
		try {
			const bookmarksData = await axios.get<{
				data: BookmarksCountTypes;
				error: Error;
			}>(
				`${NEXT_API_URL}${GET_BOOKMARKS_COUNT}?access_token=${session?.access_token}`,
			);

			return bookmarksData?.data;
		} catch (error_) {
			const error = error_ as Error;
			return {
				data: null,
				error,
			};
		}
	} else {
		// return undefined;
		return {
			data: null,
			error: { name: "NO user id", message: "NO user id" },
		};
	}
};

export const addBookmarkMinData = async ({
	url,
	category_id,
	update_access,
	session,
}: AddBookmarkMinDataPayloadTypes) => {
	try {
		const apiResponse = await axios.post(
			`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`,
			{
				access_token: session?.access_token,
				url,
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
	session,
}: AddBookmarkScreenshotPayloadTypes) => {
	try {
		const apiResponse = await axios.post(
			`${NEXT_API_URL}${ADD_URL_SCREENSHOT_API}`,
			{
				access_token: session?.access_token,
				url,
				id,
			},
		);

		return apiResponse;
	} catch (error) {
		return error;
	}
};

export const deleteData = async (item: DeleteBookmarkPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${DELETE_BOOKMARK_DATA_API}`,
			{
				data: { deleteData: item?.deleteData },
				access_token: item?.session?.access_token,
			},
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const moveBookmarkToTrash = async ({
	data,
	isTrash,
	session,
}: MoveBookmarkToTrashApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${MOVE_BOOKMARK_TO_TRASH_API}`,
			{
				data,
				isTrash,
				access_token: session?.access_token,
			},
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const clearBookmarksInTrash = async ({
	user_id = undefined,
	session,
}: ClearBookmarksInTrashApiPayloadTypes) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${CLEAR_BOOKMARK_TRASH_API}`,
			{
				user_id,
				access_token: session?.access_token,
			},
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const searchBookmarks = async (
	searchText: string,
	category_id: CategoryIdUrlTypes,
	session: SupabaseSessionType,
): Promise<{
	data: BookmarksPaginatedDataTypes[] | null;
	error: Error;
}> => {
	if (!isEmpty(searchText) && searchText !== "#" && !isNull(session)) {
		const accessToken =
			!isNull(session?.access_token) || session?.access_token
				? session?.access_token
				: "null";

		const categoryId = !isNull(category_id) ? category_id : "null";

		try {
			const response = await axios.get<{
				data: BookmarksPaginatedDataTypes[];
				error: Error;
			}>(
				`${NEXT_API_URL}${SEARCH_BOOKMARKS}?search=${searchText}&access_token=${accessToken}&user_id=${session?.user?.id}&category_id=${categoryId}`,
			);
			return response?.data;
		} catch (error_) {
			const error = error_ as Error;
			return {
				data: null,
				error,
			};
		}
	}

	return {
		data: null,
		error: { name: "error", message: "error" },
	};
};

// user tags
export const fetchUserTags = async (
	user_id: string,
	session: SupabaseSessionType,
): Promise<{ data: UserTagsData[] | null; error: Error }> => {
	if (!session?.access_token) {
		return {
			data: null,
			error: { message: "no access token", name: "no access token" },
		};
	}

	if (user_id && !isEmpty(user_id)) {
		try {
			const response = await axios.get<{ data: UserTagsData[]; error: Error }>(
				`${NEXT_API_URL}${FETCH_USER_TAGS_API}?user_id=${user_id}&access_token=${session?.access_token}`,
			);
			return response?.data;
		} catch (error_) {
			const error = error_ as Error;
			return {
				data: null,
				error,
			};
		}
	}

	return {
		data: null,
		error: { message: "no user id", name: "no user id" },
	};
};

export const addUserTags = async ({
	userData,
	tagsData,
	session,
}: AddUserTagsApiPayload) => {
	try {
		const response = await axios.post<{ data: UserTagsData }>(
			`${NEXT_API_URL}${CREATE_USER_TAGS_API}`,
			{
				name: tagsData?.name,
				user_id: userData?.id,
				access_token: session?.access_token,
			},
		);
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const addTagToBookmark = async ({
	selectedData,
	session,
}: AddTagToBookmarkApiPayload) => {
	try {
		const response = await axios.post<{
			data: SingleListData;
		}>(`${NEXT_API_URL}${ADD_TAG_TO_BOOKMARK_API}`, {
			data: selectedData,
			access_token: session?.access_token,
		});
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const removeTagFromBookmark = async ({
	selectedData,
	session,
}: {
	selectedData: { bookmark_id: number; tag_id: number };
	session: SupabaseSessionType;
}) => {
	try {
		const response = await axios.post<{
			data: UserTagsData;
			error: Error;
		}>(`${NEXT_API_URL}${REMOVE_TAG_FROM_BOOKMARK_API}`, {
			tag_id: selectedData?.tag_id,
			bookmark_id: selectedData?.bookmark_id,
			access_token: session?.access_token,
		});
		return response?.data;
	} catch (error) {
		return error;
	}
};

export const fetchBookmarksViews = async ({
	category_id,
	session,
}: {
	category_id: number | string | null;
	session: SupabaseSessionType;
}): Promise<{
	data: BookmarkViewDataTypes | null;
	error: Error;
}> => {
	if (!isUserInACategory(category_id as string)) {
		return {
			data: null,
			error: { message: "user not in category", name: "user not in category" },
		};
	}

	if (!session?.access_token && isNull(category_id)) {
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
			access_token: session?.access_token,
		});
		return response?.data;
	} catch (error_) {
		const error = error_ as Error;
		return {
			data: null,
			error,
		};
	}
};

// user catagories

export const fetchCategoriesData = async (
	userId: string,
	userEmail: string,
	session: SupabaseSessionType,
): Promise<{
	data: CategoriesData[] | null;
	error: Error;
}> => {
	if (!session?.access_token) {
		return {
			data: null,
			error: { name: "no access token", message: "no access token" },
		};
	}

	if (!isEmpty(userId)) {
		try {
			const response = await axios.post<{
				data: CategoriesData[] | null;
				error: Error;
			}>(`${NEXT_API_URL}${FETCH_USER_CATEGORIES_API}`, {
				userEmail,
				user_id: userId,
				access_token: session?.access_token,
			});

			return response.data;
		} catch (error_) {
			const error = error_ as Error;
			return {
				data: null,
				error,
			};
		}
	} else {
		return {
			data: null,
			error: { name: "no user id", message: "no user id" },
		};
	}
};

export const addUserCategory = async ({
	user_id,
	name,
	category_order,
	session,
}: {
	category_order: number[];
	name: string;
	session: SupabaseSessionType;
	user_id: string;
}) => {
	try {
		const response = await axios.post<{
			data: CategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${CREATE_USER_CATEGORIES_API}`, {
			name,
			user_id,
			access_token: session?.access_token,
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
	session,
}: DeleteUserCategoryApiPayload) => {
	try {
		const response = await axios.post<{
			data: CategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_USER_CATEGORIES_API}`, {
			category_id,
			category_order,
			access_token: session?.access_token,
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
	session,
}: AddCategoryToBookmarkApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${ADD_CATEGORY_TO_BOOKMARK_API}`,
			{
				category_id: isNull(category_id) || !category_id ? 0 : category_id,
				bookmark_id,
				update_access,
				access_token: session?.access_token,
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
	session,
}: UpdateCategoryApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${UPDATE_USER_CATEGORIES_API}`,
			{
				category_id,
				updateData,
				access_token: session?.access_token,
			},
		);

		return response;
	} catch (error) {
		return error;
	}
};

export const updateCategoryOrder = async ({
	order,
	session,
}: UpdateCategoryOrderApiPayload) => {
	try {
		const response = await axios.post(
			`${NEXT_API_URL}${UPDATE_CATEGORY_ORDER_API}`,
			{
				category_order: order,
				access_token: session?.access_token,
			},
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
	userId,
	session,
}: {
	category_id: number;
	edit_access: boolean;
	emailList: string[];
	hostUrl: string;
	session: SupabaseSessionType;
	userId: string;
}) => {
	const response = await axios.post(
		`${NEXT_API_URL}${SEND_COLLABORATION_EMAIL_API}`,
		{
			emailList,
			category_id,
			edit_access,
			hostUrl,
			userId,
			access_token: session?.access_token,
		},
	);

	return response;
};

export const fetchSharedCategoriesData = async (
	session: SupabaseSessionType,
): Promise<{
	data: FetchSharedCategoriesData[] | null;
	error: Error;
}> => {
	if (!session?.access_token) {
		return {
			data: null,
			error: { message: "no access token", name: "no access token" },
		};
	}

	try {
		const response = await axios.get<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(
			`${NEXT_API_URL}${FETCH_SHARED_CATEGORIES_DATA_API}?access_token=${session?.access_token}`,
		);

		return response?.data;
	} catch (error) {
		const catchError = error as Error;
		return {
			data: null,
			error: catchError,
		};
	}
};

export const deleteSharedCategoriesUser = async ({
	id,
	session,
}: {
	id: number;
	session: SupabaseSessionType;
}) => {
	try {
		const response = await axios.post<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_SHARED_CATEGORIES_USER_API}`, {
			id,
			access_token: session?.access_token,
		});

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const updateSharedCategoriesUserAccess = async ({
	id,
	updateData,
	session,
}: UpdateSharedCategoriesUserAccessApiPayload) => {
	try {
		const response = await axios.post<{
			data: FetchSharedCategoriesData[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_SHARED_CATEGORY_USER_ROLE_API}`, {
			id,
			updateData,
			access_token: session?.access_token,
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
}): Promise<{
	data: ProfilesTableTypes[] | null;
	error: Error;
}> => {
	if (!session?.access_token) {
		return {
			data: null,
			error: { name: "No access Token", message: "No Access token" },
		};
	}

	const existingOauthAvatarUrl = session?.user?.user_metadata?.avatar_url;

	try {
		if (userId) {
			const response = await axios.get<{
				data: ProfilesTableTypes[] | null;
				error: Error;
			}>(
				`${NEXT_API_URL}${FETCH_USER_PROFILE_API}?access_token=${
					session?.access_token
				}&user_id=${userId}${
					!isNil(existingOauthAvatarUrl)
						? `&avatar=${existingOauthAvatarUrl}`
						: ``
				}`,
			);
			return response?.data;
		}

		return {
			data: null,
			error: { name: "No user id", message: "No user id" },
		};
	} catch (error_) {
		const error = error_ as Error;
		return {
			data: null,
			error,
		};
	}
};

export const updateUserProfile = async ({
	id,
	updateData,
	session,
}: UpdateUserProfileApiPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, {
			id,
			updateData,
			access_token: session?.access_token,
		});

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const updateUsername = async ({
	id,
	username,
	session,
}: UpdateUsernameApiPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${UPDATE_USERNAME_API}`, {
			id,
			username,
			access_token: session?.access_token,
		});

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const deleteUser = async ({ id, session }: DeleteUserApiPayload) => {
	try {
		const response = await axios.post<{
			data: ProfilesTableTypes[] | null;
			error: Error;
		}>(`${NEXT_API_URL}${DELETE_USER_API}`, {
			id,
			email: session?.user?.email,
			access_token: session?.access_token,
		});

		return response?.data;
	} catch (error) {
		return error;
	}
};

export const getUserProfilePic = async ({
	email,
	session,
}: GetUserProfilePicPayload): Promise<{
	data: UserProfilePicTypes[] | null;
	error: Error;
}> => {
	if (!isNil(email) && !isEmpty(email)) {
		try {
			const response = await axios.get<{
				data: UserProfilePicTypes[] | null;
				error: Error;
			}>(
				`${NEXT_API_URL}${GET_USER_PROFILE_PIC_API}?access_token=${
					session?.access_token ?? ""
				}&email=${email}`,
			);

			return response?.data;
		} catch (error) {
			return { data: null, error: error as Error };
		}
	}

	return { data: null, error: "Email not present" as unknown as Error };
};

// file upload

export const uploadFile = async ({
	file,
	session,
	category_id,
}: UploadFileApiPayload) => {
	try {
		const response = await axios.post<UploadFileApiResponse>(
			`${NEXT_API_URL}${UPLOAD_FILE_API}`,
			{
				file,
				access_token: session?.access_token,
				category_id,
			},
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			},
		);

		return response?.data;
	} catch (error) {
		return error;
	}
};

// user settings
export const uploadProfilePic = async ({
	file,
	session,
}: UploadProfilePicPayload) => {
	try {
		const response = await axios.post<UploadProfilePicApiResponse>(
			`${NEXT_API_URL}${UPLOAD_PROFILE_PIC_API}`,
			{
				file,
				access_token: session?.access_token,
			},
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			},
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

export const signInWithEmailPassword = async (
	email: string,
	password: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	return { error };
};

export const signUpWithEmailPassword = async (
	email: string,
	password: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: SupabaseClient<any, "public", any>,
) => {
	const { error } = await supabase.auth.signUp({
		email,
		password,
	});

	return { error };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
	await supabase.auth.signOut();
};
