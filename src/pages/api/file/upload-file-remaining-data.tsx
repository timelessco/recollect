// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import fs from "fs";
import { type NextApiResponse } from "next";
import { type SupabaseClient } from "@supabase/supabase-js";
import ffmpeg from "fluent-ffmpeg";
// import ffmpegStatic from "ffmpeg-static";
// import ffmpeg from "fluent-ffmpeg";
import { isNil } from "lodash";
import fetch from "node-fetch";

import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import {
	FILES_STORAGE_NAME,
	isVideoFileType,
	MAIN_TABLE_NAME,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = UploadFileApiResponse;

// this func gets the image caption
const query = async (source: string) => {
	const isImgCaptionEnvironmentsPresent =
		process.env.IMAGE_CAPTION_TOKEN && process.env.IMAGE_CAPTION_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await fetch(source);
		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

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
	} else {
		log(`ERROR: Img caption failed due to missing tokens in env`);
		return null;
	}
};

const notVideoLogic = async (publicUrl: string) => {
	const ogImage = publicUrl;
	const imageCaption = await query(ogImage as string);

	const jsonResponse = (await imageCaption?.json()) as Array<{
		generated_text: string;
	}>;

	let imgData;

	if (publicUrl) {
		try {
			imgData = await blurhashFromURL(publicUrl);
		} catch (error) {
			log("Blur hash error", error);
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: jsonResponse?.[0]?.generated_text,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
	};

	return { ogImage, meta_data };
};

const videoLogic = async (videoUrl: string, supabase: SupabaseClient) => {
	ffmpeg(videoUrl)
		.screenshots({
			// timestamps: [30.5, "80%", "01:10.123"],
			timestamps: ["1%"],
			filename: "testing.png",
			folder: "./src/pages/api/file",
			size: "320x240",
		})
		.on("end", () => {
			(async () => {
				const { error: thumbnailError } = await supabase.storage
					.from(FILES_STORAGE_NAME)
					.upload(
						"/testing",
						fs.readFileSync("./src/pages/api/file/testing.png"),
						{
							contentType: "image/png",
							upsert: true,
						},
					);

				fs.unlinkSync("./src/pages/api/file/testing.png");
			})();

			return null;
		});

	// .output();
	// .on("end", (stdout, stderr) => {
	// 	console.log("Transcoding succeeded !", stdout, stderr);
	// });

	// // const videoUrl = req.query.url;

	// if (!videoUrl) {
	// 	// return res.status(400).json({ error: 'Video URL is required' });
	// 	return;
	// }

	// try {
	// 	const response = await fetch(videoUrl);
	// 	if (!response.ok) {
	// 		throw new Error("Failed to fetch video");
	// 	}

	// 	const videoStream = response.body;

	// 	const thumbnailBuffer = await new Promise((resolve, reject) => {
	// 		const buffers = [];
	// 		ffmpeg(Readable.from(videoStream))
	// 			.on("filenames", (filenames) => {
	// 				console.log("Will generate " + filenames.join(", "));
	// 			})
	// 			.on("end", () => {
	// 				console.log("Screenshots taken");
	// 			})
	// 			.on("error", reject)
	// 			.screenshots({
	// 				count: 1,
	// 				folder: "/tmp",
	// 				size: "320x240",
	// 				timestamps: ["5"],
	// 			})
	// 			.on("end", () => {
	// 				const readStream = fs.createReadStream("/tmp/tn.png");
	// 				readStream.on("data", (chunk) => buffers.push(chunk));
	// 				readStream.on("end", () => resolve(Buffer.concat(buffers)));
	// 			});
	// 	});

	// 	const base64Thumbnail = thumbnailBuffer.toString("base64");

	// 	console.log("bbbb", base64Thumbnail);
	// 	// res.status(200).json({ thumbnail: base64Thumbnail });
	// } catch (error) {
	// 	console.error(error);
	// 	// res.status(500).json({ error: 'Failed to generate thumbnail' });
	// }
};

export default async function handler(
	request: NextApiRequest<{
		fileType: SingleListData["type"];
		id: SingleListData["id"];
		publicUrl: SingleListData["ogImage"];
	}>,
	response: NextApiResponse<Data>,
) {
	const { publicUrl, id, fileType } = request.body;

	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	let meta_data: ImgMetadataType = {
		img_caption: null,
		width: null,
		height: null,
		ogImgBlurUrl: null,
		favIcon: null,
	};

	const isVideo = isVideoFileType(fileType ?? "");

	if (!isVideo) {
		const { meta_data: metaData } = await notVideoLogic(publicUrl);

		meta_data = metaData;
	} else {
		await videoLogic(publicUrl, supabase);
	}

	const { error: DBerror } = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			meta_data,
			description: (meta_data?.img_caption as string) || "",
		})
		.match({ id, user_id: userId });

	if (isNil(DBerror)) {
		response.status(200).json({ success: true, error: null });
	} else {
		response.status(500).json({
			success: false,
			error: DBerror,
		});
	}
}
