// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { blurhashFromURL } from "blurhash-from-url";
import { verify, type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isEmpty, isNil, isNull } from "lodash";

import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
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

	verify(accessToken, process.env.SUPABASE_JWT_SECRET_KEY, (error) => {
		if (error) {
			response.status(500).json({ data: null, error, message: null });
			throw new Error("ERROR");
		}
	});

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const upload = async (base64info: string) => {
		const imgName = `img${Math.random()}.jpg`;

		await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.upload(
				`${STORAGE_SCRAPPED_IMAGES_PATH}/${imgName}`,
				decode(base64info),
				{
					contentType: "image/jpg",
				},
			);

		const { data: storageData } = supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.getPublicUrl(`${STORAGE_SCRAPPED_IMAGES_PATH}/${imgName}`);

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
		imgUrl = url;
	}

	if (scrapperResponse?.data?.OgImage) {
		imgData = await blurhashFromURL(scrapperResponse?.data?.OgImage);

		const image = await axios.get(scrapperResponse?.data?.OgImage, {
			responseType: "arraybuffer",
		});
		const returnedB64 = Buffer.from(image.data).toString("base64");

		imgUrl = await upload(returnedB64);
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
			throw new Error("ERROR");
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
				throw new Error("ERROR");
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
			throw new Error("ERROR");
		} else {
			response.status(200).json({
				data,
				error: null,
				message:
					updateAccess === false ? ADD_UPDATE_BOOKMARK_ACCESS_ERROR : null,
			});
		}
	}
}
