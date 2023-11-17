// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { blurhashFromURL } from "blurhash-from-url";
import { type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isEmpty, isNil, isNull } from "lodash";
import uniqid from "uniqid";

import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_UPDATE_BOOKMARK_ACCESS_ERROR,
	BOOKMAKRS_STORAGE_NAME,
	bookmarkType,
	MAIN_TABLE_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
	TIMELESS_SCRAPPER_API,
	UNCATEGORIZED_URL,
	URL_IMAGE_CHECK_PATTERN,
} from "../../../utils/constants";
import { getBaseUrl } from "../../../utils/helpers";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

export default async function handler(
	request: NextApiRequest<AddBookmarkMinDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const accessToken = request.body.access_token;
	const { url } = request.body;
	const { category_id: categoryId } = request.body;
	const { update_access: updateAccess } = request.body;
	const tokenDecode: { sub: string } = jwtDecode(accessToken);
	const userId = tokenDecode?.sub;

	const { error: _error } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error, message: null });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const upload = async (
		base64info: string,
		userIdForStorage: ProfilesTableTypes["id"],
	) => {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath = `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

		await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.upload(storagePath, decode(base64info), {
				contentType: "image/jpg",
			});

		const { data: storageData } = supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.getPublicUrl(storagePath);

		return storageData?.publicUrl;
	};

	// when adding a bookmark into a category the same bookmark should not be present in the category
	const checkIfBookmarkAlreadyExists = async () => {
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
			.eq("category_id", categoryId);

		if (!isNull(checkBookmarkError)) {
			response.status(500).json({
				data: null,
				error: checkBookmarkError,
				message: "Something went wrong in duplicate bookmark category check",
			});
			throw new Error("Duplicate check error");
		}

		return !isEmpty(checkBookmarkData);
	};

	try {
		const scrapperResponse = await axios.post<{
			OgImage: string;
			description: string;
			favIcon: string;
			title: string;
		}>(TIMELESS_SCRAPPER_API, {
			url,
		});

		let imgData;

		let imgUrl;

		const isUrlAnImage = url?.match(URL_IMAGE_CHECK_PATTERN);

		if (!isNil(isUrlAnImage) && !isEmpty(isUrlAnImage)) {
			// if the url itself is an img, like something.com/img.jgp, then we are not going to upload it to s3
			imgUrl = url;
		}

		if (scrapperResponse?.data?.OgImage) {
			try {
				const image = await axios.get(scrapperResponse?.data?.OgImage, {
					responseType: "arraybuffer",
				});
				const returnedB64 = Buffer.from(image.data).toString("base64");
				imgData = await blurhashFromURL(scrapperResponse?.data?.OgImage);
				// this code is for the blur hash resize issue, uncomment this after blurhashFromURL supports image resize
				// let returnedB64;
				// if (imgData?.height > 600 || imgData?.width > 600) {
				// 	const compressedImg = await sharp(image.data)
				// 	.resize({ width: 600, height: 600 })
				// 	.toBuffer();

				// 	returnedB64 = compressedImg?.toString("base64");
				// 	console.log("com", compressedImg, imgData);
				// } else {
				// 	returnedB64 = Buffer.from(image.data).toString("base64");
				// }

				imgUrl = await upload(returnedB64, userId);
			} catch (error) {
				log("Error: ogImage is 404", error);
				imgUrl = null;
			}
		}

		const favIconLogic = () => {
			if (scrapperResponse?.data?.favIcon) {
				if (scrapperResponse?.data?.favIcon?.includes("https://")) {
					return scrapperResponse?.data?.favIcon;
				} else {
					return `https://${getBaseUrl(url)}${scrapperResponse?.data?.favIcon}`;
				}
			} else {
				return null;
			}
		};

		const meta_data = {
			img_caption: null,
			width: imgData?.width,
			height: imgData?.height,
			ogImgBlurUrl: imgData?.encoded,
			favIcon: favIconLogic(),
		};

		if (
			updateAccess === true &&
			!isNull(categoryId) &&
			categoryId !== "null" &&
			categoryId !== 0 &&
			categoryId !== UNCATEGORIZED_URL
		) {
			const isBookmarkAlreadyPresentInCategory =
				await checkIfBookmarkAlreadyExists();

			if (isBookmarkAlreadyPresentInCategory) {
				// the bookmark is already there in the category
				response.status(500).json({
					data: null,
					error: "Bookmark already present in this category",
					message: "Bookmark already present in this category",
				});
				throw new Error("ERROR: Bookmark already present in this category");
			} else {
				// the bookmark to be added is not there in the category so we add
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
							title: scrapperResponse.data.title,
							user_id: userId,
							description: scrapperResponse?.data?.description,
							ogImage: imgUrl,
							category_id: categoryId,
							meta_data,
							type: bookmarkType,
						},
					])
					.select();
				if (!isNull(error)) {
					response.status(500).json({ data: null, error, message: null });
					throw new Error("ERROR: add min data error");
				} else {
					response.status(200).json({ data, error: null, message: null });
				}
			}
		} else {
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
						ogImage: imgUrl,
						category_id: 0,
						meta_data,
						type: bookmarkType,
					},
				])
				.select();

			if (!isNull(error)) {
				response.status(500).json({ data: null, error, message: null });
				throw new Error("ERROR: add min data error");
			} else {
				response.status(200).json({
					data,
					error: null,
					message:
						updateAccess === false ? ADD_UPDATE_BOOKMARK_ACCESS_ERROR : null,
				});
			}
		}
	} catch (scrapperError) {
		response.status(500).json({
			data: null,
			error: scrapperError as string,
			message: "Scrapper error",
		});
		throw new Error("ERROR: scrapper error");
	}
}
