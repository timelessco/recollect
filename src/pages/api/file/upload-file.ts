// you might want to use regular 'fs' and not a promise one

import { log } from "console";
import fs, { promises as fileSystem } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import jwtDecode from "jwt-decode";
import isNil from "lodash/isNil";

import {
	type ImgMetadataType,
	type UploadFileApiPayload,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import { FILES_STORAGE_NAME, MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { isUserInACategory } from "../../../utils/helpers";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable complexity */
// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

const query = async (filename: string) => {
	const data = fs.readFileSync(filename);

	try {
		const imgCaptionResponse = await fetch(
			process.env.IMAGE_CAPTION_URL as string,
			{
				headers: {
					Authorization: `Bearer ${process.env.IMAGE_CAPTION_TOKEN}`,
				},
				method: "POST",
				body: data,
			},
		);

		return imgCaptionResponse;
	} catch (error) {
		log("Img caption error", error);
		return null;
	}
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
	const supabase = apiSupabaseClient();

	// parse form with a Promise wrapper
	const data = (await new Promise((resolve, reject) => {
		const form = new IncomingForm();

		form.parse(request, (error, fields, files) => {
			if (error) {
				reject(error);
				return;
			}

			resolve({ fields, files });
		});
	})) as {
		fields: {
			access_token?: string;
			category_id?: string;
			thumbnailBase64?: UploadFileApiPayload["thumbnailBase64"];
		};
		files: {
			file?: Array<{
				filepath?: string;
				mimetype: string;
				originalFilename?: string;
			}>;
		};
	};

	const accessToken = data?.fields?.access_token?.[0];

	const { error: _error } = verifyAuthToken(accessToken as string);

	if (_error) {
		response.status(500).json({ success: false, error: _error });
		throw new Error(`ERROR: token error ${_error.message}`, _error);
	}

	const categoryId = data?.fields?.category_id?.[0];

	const categoryIdLogic = categoryId
		? isUserInACategory(categoryId)
			? categoryId
			: 0
		: 0;

	const tokenDecode: { sub: string } = jwtDecode(accessToken as string);
	const userId = tokenDecode?.sub;

	let contents;

	if (data?.files?.file && data?.files?.file[0]?.filepath) {
		contents = await fileSystem.readFile(data?.files?.file[0]?.filepath, {
			encoding: "base64",
		});
	}

	const fileName = data?.files?.file?.[0]?.originalFilename;
	const fileType = data?.files?.file?.[0]?.mimetype;

	if (contents) {
		const storagePath = `public/${userId}/${fileName}`;
		const { error: storageError } = await supabase.storage
			.from(FILES_STORAGE_NAME)
			.upload(storagePath, decode(contents), {
				contentType: fileType,
				upsert: true,
			});
		const { data: storageData, error: publicUrlError } = supabase.storage
			.from(FILES_STORAGE_NAME)
			.getPublicUrl(storagePath) as {
			data: { publicUrl: string };
			error: UploadFileApiResponse["error"];
		};

		if (isNil(storageError)) {
			let meta_data: ImgMetadataType = {
				img_caption: null,
				width: null,
				height: null,
				ogImgBlurUrl: null,
				favIcon: null,
			};
			const isVideo = fileType?.includes("video");

			let ogImage;

			if (!isVideo) {
				ogImage = storageData?.publicUrl;
				const imageCaption = await query(
					data?.files?.file?.[0]?.filepath as string,
				);

				const jsonResponse = (await imageCaption?.json()) as Array<{
					generated_text: string;
				}>;

				let imgData;

				if (storageData?.publicUrl) {
					try {
						imgData = await blurhashFromURL(storageData?.publicUrl);
					} catch (error) {
						log("Blur hash error", error);
						imgData = {};
					}
				}

				meta_data = {
					img_caption: jsonResponse[0]?.generated_text,
					width: imgData?.width ?? null,
					height: imgData?.height ?? null,
					ogImgBlurUrl: imgData?.encoded ?? null,
					favIcon: null,
				};
			} else {
				// if the file is a video, we upload the video thumbnail base64 to s3 and then we get the images blur hash and set the img s3 url as ogImage and blur hash in meta data
				const base64 = data?.fields?.thumbnailBase64?.[0]?.split("base64,")[1];

				const videoStoragePath = `public/${userId}/thumbnail-${fileName}`;

				const { error: thumbnailError } = await supabase.storage
					.from(FILES_STORAGE_NAME)
					.upload(videoStoragePath, decode(base64 ?? ""), {
						contentType: "image/png",
						upsert: true,
					});

				if (!isNil(thumbnailError)) {
					throw new Error(`ERROR: thumbnailError ${thumbnailError?.message}`);
				}

				const { data: thumbnailUrl, error: thumbnailUrlError } =
					supabase.storage
						.from(FILES_STORAGE_NAME)
						.getPublicUrl(videoStoragePath) as {
						data: { publicUrl: string };
						error: UploadFileApiResponse["error"];
					};

				if (!isNil(thumbnailUrlError)) {
					throw new Error(
						`ERROR: thumbnailUrlError ${thumbnailUrlError?.toString}`,
					);
				}

				ogImage = thumbnailUrl?.publicUrl;

				let imgData;
				if (thumbnailUrl?.publicUrl) {
					try {
						imgData = await blurhashFromURL(thumbnailUrl?.publicUrl);
					} catch (error) {
						log("Blur hash error", error);
						imgData = {};
					}
				}

				meta_data = {
					img_caption: null,
					width: imgData?.width ?? null,
					height: imgData?.height ?? null,
					ogImgBlurUrl: imgData?.encoded ?? null,
					favIcon: null,
				};
			}

			const { error: DBerror } = await supabase
				.from(MAIN_TABLE_NAME)
				.insert([
					{
						url: storageData?.publicUrl,
						title: fileName,
						user_id: userId,
						description: (meta_data?.img_caption as string) || "",
						ogImage,
						category_id: categoryIdLogic,
						type: fileType,
						meta_data,
					},
				])
				.select();

			if (isNil(storageError) && isNil(publicUrlError) && isNil(DBerror)) {
				response.status(200).json({ success: true, error: null });
			} else {
				response.status(500).json({
					success: false,
					error: storageError ?? publicUrlError ?? DBerror,
				});
			}
		} else {
			// storage error
			response.status(500).json({
				success: false,
				error: storageError,
			});
		}
	} else {
		response.status(500).json({
			success: false,
			error: "error in payload file data",
		});
	}
};
