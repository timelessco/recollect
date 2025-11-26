import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import axios from "axios";
import { fileTypeFromStream } from "file-type";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";
import ogs from "open-graph-scraper";

import { getMediaType } from "../../../async/supabaseCrudHelpers";
import { canEmbedInIframe } from "../../../async/uploads/iframe-test";
import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_REMAINING_BOOKMARK_API,
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	OG_IMAGE_PREFERRED_SITES,
	SHARED_CATEGORIES_TABLE_NAME,
	SKIP_OG_IMAGE_DOMAINS,
	uncategorizedPages,
} from "../../../utils/constants";
import {
	checkIfUrlAnImage,
	checkIfUrlAnMedia,
	getAxiosConfigWithAuth,
	getNormalisedImageUrl,
} from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

import { vet } from "@/utils/try";

// this api get the scrapper data, checks for duplicate bookmarks and then adds it to the DB
type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

type ScrapperTypes = {
	data: {
		OgImage: string | null;
		description: string | null;
		favIcon: string | null;
		title: string | null;
	};
};

// tells if user is either category owner or collaborator
export const checkIfUserIsCategoryOwnerOrCollaborator = async (
	supabase: SupabaseClient,
	categoryId: SingleListData["category_id"],
	userId: SingleListData["user_id"]["id"],
	email: ProfilesTableTypes["email"],
	response: NextApiResponse,
) => {
	const { data: categoryData, error: categoryError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("user_id")
		.eq("id", categoryId);

	if (categoryError) {
		console.error("Error checking category ownership:", categoryError);
		Sentry.captureException(categoryError, {
			tags: {
				operation: "check_category_ownership",
				userId,
			},
			extra: { categoryId },
		});
		response
			.status(500)
			.json({ data: null, error: categoryError?.message, message: null });
		return false;
	}

	if (categoryData?.[0]?.user_id === userId) {
		// user is the owner of the category
		return true;
	}

	// check if user is a collaborator of the category
	const { data: shareData, error: shareError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.select("id, edit_access")
		.eq("category_id", categoryId)
		.eq("email", email);

	if (shareError) {
		console.error("Error checking share access:", shareError);
		Sentry.captureException(shareError, {
			tags: {
				operation: "check_share_access",
				userId,
			},
			extra: { categoryId, email },
		});
		response
			.status(500)
			.json({ data: null, error: shareError?.message, message: null });
		return false;
	}

	if (!isEmpty(shareData)) {
		// user is a collaborator, if user does not have edit access then return false so that DB is not updated with data
		return shareData?.[0]?.edit_access;
	}

	// user is not the owner or the collaborator of the collection
	return false;
};

export default async function handler(
	request: NextApiRequest<AddBookmarkMinDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	try {
		const { url } = request.body;

		const { update_access: updateAccess } = request.body;

		if (!updateAccess) {
			console.warn("User does not have update access:", { url });
			response.status(403).json({
				data: null,
				error: "User does not have update access",
				message: null,
			});
			return;
		}

		// try {
		// 	// 5 seconds timeout
		// 	// Only consider 2xx and 3xx status codes as successful
		// 	const urlCheckResponse = await axios.head(url, {
		// 		timeout: 5_000,
		// 		validateStatus: (status) => status >= 200 && status < 400,
		// 	});

		// 	// This check might be redundant since validateStatus already filters the status codes
		// 	// But keeping it as an extra safety measure
		// 	if (urlCheckResponse.status >= 400) {
		// 		response.status(400).json({
		// 			data: null,
		// 			error: "This bookmark URL doesn't exist",
		// 			message: `Received status code ${urlCheckResponse.status} when trying to access the URL`,
		// 		});
		// 		return;
		// 	}
		// } catch {
		// 	response.status(400).json({
		// 		data: null,
		// 		error: "This bookmark URL doesn't exist",
		// 		message:
		// 			"Could not verify the URL. Please check if the URL is correct and accessible.",
		// 	});
		// 	return;
		// }

		const supabase = apiSupabaseClient(request, response);

		// Check for auth errors
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;
		const email = userData?.user?.email;

		if (userError || !userId || !email) {
			console.warn("User authentication failed:", {
				error: userError,
				url,
			});
			response.status(401).json({
				data: null,
				error: "Unauthorized",
				message: null,
			});
			return;
		}

		const { category_id: categoryId } = request.body;

		console.log("add-bookmark-min-data API called:", {
			userId,
			url,
			categoryId,
		});

		const urlHost = new URL(url)?.hostname?.toLowerCase();

		const isOgImagePreferred = OG_IMAGE_PREFERRED_SITES?.some((keyword) =>
			urlHost?.includes(keyword),
		);
		const shouldSkipOgImage = SKIP_OG_IMAGE_DOMAINS?.some((keyword) =>
			urlHost?.includes(keyword),
		);

		let scrapperResponse: ScrapperTypes = {
			data: {
				title: null,
				description: null,
				OgImage: null,
				favIcon: null,
			},
		};

		const userAgent =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

		const [scrapperError, ogsResult] = await vet(() =>
			ogs({
				url,
				fetchOptions: { headers: { "user-agent": userAgent } },
			}),
		);

		if (scrapperError) {
			console.warn(`Scrapper error for url: ${url}`, scrapperError);

			// if scrapper error is there then we just add the url host name as the title and proceed
			scrapperResponse = {
				data: {
					title: new URL(url)?.hostname,
					description: null,
					OgImage: null,
					favIcon: null,
				},
			};
		}

		scrapperResponse = {
			data: {
				title: ogsResult?.result?.ogTitle ?? null,
				description: ogsResult?.result?.ogDescription ?? null,
				OgImage: shouldSkipOgImage
					? null
					: (ogsResult?.result?.ogImage?.[0]?.url ?? null),
				favIcon: ogsResult?.result?.favicon ?? null,
			},
		};

		// this will either be 0 (uncategorized) or any number
		// this also checks if the categoryId is one of the strings mentioned in uncategorizedPages , if they are it will be 0
		const computedCategoryId =
			updateAccess === true &&
			!isNull(categoryId) &&
			categoryId !== "null" &&
			categoryId !== 0 &&
			!uncategorizedPages?.includes(categoryId as string)
				? categoryId
				: 0;

		if (computedCategoryId !== 0) {
			// user is adding bookmark into a category
			const checkIfUserIsCategoryOwnerOrCollaboratorValue =
				await checkIfUserIsCategoryOwnerOrCollaborator(
					supabase,
					computedCategoryId as number,
					userId as string,
					email as string,
					response,
				);

			if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
				console.warn(
					`User is neither owner or collaborator for the collection ${categoryId} or does not have edit access for url: ${url}`,
				);
				response.status(403).json({
					data: null,
					error:
						"User is neither owner or collaborator for the collection or does not have edit access",
					message: null,
				});
				return;
			}

			// when adding a bookmark into a category the same bookmark should not be present in the category
			// this function checks if the bookmark is already present in the category
			const {
				data: checkBookmarkData,
				error: checkBookmarkError,
			}: {
				data: Array<{ id: SingleListData["id"] }> | null;
				error: PostgrestError | VerifyErrors | string | null;
			} = await supabase
				.from(MAIN_TABLE_NAME)
				.select(`id`)
				.eq("url", url)
				.eq("category_id", categoryId)
				.eq("trash", false);

			if (!isNull(checkBookmarkError)) {
				console.error(
					"Error checking for duplicate bookmark:",
					checkBookmarkError,
				);
				Sentry.captureException(checkBookmarkError, {
					tags: {
						operation: "check_duplicate_bookmark",
						userId,
					},
					extra: { url, categoryId },
				});
				response.status(500).json({
					data: null,
					error: "Error checking for duplicate bookmark",
					message: null,
				});
				return;
			}

			if (!isEmpty(checkBookmarkData)) {
				console.warn(
					`Bookmark already present in category ${categoryId} for url: ${url}`,
				);
				response.status(409).json({
					data: null,
					error: "Bookmark already present in category",
					message: null,
				});
				return;
			}
		}

		let ogImageToBeAdded = null;

		const isUrlOfMimeType = await checkIfUrlAnMedia(url);
		// ***** here we are checking the url is of an mime type or not,if it is so we set the url in ogImage *****
		// ***** if it an  image we upload to s3 and for video we take screenshot *****
		let iframeAllowedValue = null;
		if (isUrlOfMimeType) {
			const isUrlAnImage = await checkIfUrlAnImage(url);
			// this check is to avoid setting the video,pdf urls in the ogImage column because we only render image in frontend
			if (isUrlAnImage) {
				ogImageToBeAdded = url;
			} else {
				ogImageToBeAdded = null;
			}
		} else {
			ogImageToBeAdded = scrapperResponse?.data?.OgImage;
			// Iframe check
			iframeAllowedValue = isOgImagePreferred
				? false
				: await canEmbedInIframe(url);
			if (!iframeAllowedValue) {
				console.warn(`Iframe embedding not allowed for URL: ${url}`);
			}
		}

		const favIcon = await getNormalisedImageUrl(
			scrapperResponse?.data?.favIcon,
			url,
		);

		// const url = "https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg";

		const response_ = await fetch(url);
		const fileType = await fileTypeFromStream(response_?.body);
		console.log("fileType", fileType);

		// console.log(fileType);
		const mediaType = await getMediaType(url);

		// here we add the scrapper data , in the remainingApi call we add s3 data
		const {
			data,
			error,
		}: {
			data: SingleListData[] | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			.insert([
				{
					url,
					title: scrapperResponse?.data?.title,
					user_id: userId,
					description: scrapperResponse?.data?.description,
					ogImage: ogImageToBeAdded,
					category_id: computedCategoryId,
					meta_data: {
						isOgImagePreferred,
						mediaType,
						favIcon,
						iframeAllowed: iframeAllowedValue,
					},
					type: bookmarkType,
				},
			])
			.select();

		if (isEmpty(data) || isNull(data)) {
			console.warn(`Min bookmark data is empty for url: ${url}`);
			response.status(400).json({
				data: null,
				error: "Bookmark data is empty after adding",
				message: null,
			});
			return;
		}

		if (!isNull(error)) {
			console.error("Error inserting bookmark:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "insert_min_bookmark",
					userId,
				},
				extra: { url, categoryId: computedCategoryId },
			});
			response.status(500).json({
				data: null,
				error: "Error inserting bookmark",
				message: null,
			});
			return;
		}

		// Success
		console.log("Min bookmark data inserted successfully:", {
			bookmarkId: data[0]?.id,
			url,
		});
		response.status(200).json({
			data,
			error: null,
			message: "Min bookmark data inserted successfully",
		});

		// Call remaining API for media files
		if (isUrlOfMimeType) {
			// this adds the remaining data , like blur hash bucket uploads and all
			// this is called only if the url is an image url like test.com/image.png.
			// for other urls we call the screenshot api in the client side and in that api the remaining bookmark api (the one below is called)
			const requestBody = {
				id: data[0]?.id,
				favIcon: scrapperResponse?.data?.favIcon,
				url,
			};
			console.log("Calling add-remaining-bookmark-data API:", { requestBody });

			const [remainingApiError] = await vet(() =>
				axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
					requestBody,
					getAxiosConfigWithAuth(request),
				),
			);

			if (remainingApiError) {
				console.error("Remaining API error:", remainingApiError);
				Sentry.captureException(remainingApiError, {
					tags: {
						operation: "call_remaining_bookmark_api",
						userId,
					},
					extra: { bookmarkId: data[0]?.id, url },
				});
				response.status(500).json({
					data: null,
					error: "Error calling remaining bookmark api",
					message: null,
				});
			}
		} else {
			console.log(
				"Not a image(or similar mimetype) url, so not calling the add-remaining-bookmark-data api",
			);
		}
	} catch (error) {
		console.error("Unexpected error in add-bookmark-min-data:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "add_bookmark_min_data_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
			message: null,
		});
	}
}
