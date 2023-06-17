// you might want to use regular 'fs' and not a promise one

import fs, { promises as fileSystem } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import { verify } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import isNil from "lodash/isNil";
import fetch from "node-fetch";

import { type UploadFileApiResponse } from "../../../types/apiTypes";
import { FILES_STORAGE_NAME, MAIN_TABLE_NAME } from "../../../utils/constants";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

const query = async (filename: string) => {
	const data = fs.readFileSync(filename);
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
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

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
		fields: { access_token?: string };
		files: {
			file?: { filepath?: string; mimetype: string; originalFilename?: string };
		};
	};

	verify(
		data?.fields?.access_token as string,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ success: false, error: error_ });
				throw new Error("ERROR");
			}
		},
	);

	const tokenDecode: { sub: string } = jwtDecode(
		data?.fields?.access_token as string,
	);
	const userId = tokenDecode?.sub;

	let contents;

	if (data?.files?.file?.filepath) {
		contents = await fileSystem.readFile(data?.files?.file?.filepath, {
			encoding: "base64",
		});
	}

	const fileName = data?.files?.file?.originalFilename;
	const fileType = data?.files?.file?.mimetype;

	if (contents) {
		const { error: storageError } = await supabase.storage
			.from(FILES_STORAGE_NAME)
			.upload(`public/${fileName}`, decode(contents), {
				contentType: fileType,
			});
		const { data: storageData, error: publicUrlError } = supabase.storage
			.from(FILES_STORAGE_NAME)
			.getPublicUrl(`public/${fileName}`) as {
			data: { publicUrl: string };
			error: UploadFileApiResponse["error"];
		};

		const imageCaption = await query(data?.files?.file?.filepath as string);

		const jsonResponse = (await imageCaption.json()) as Array<{
			generated_text: string;
		}>;

		const { error: DBerror } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert([
				{
					url: storageData?.publicUrl,
					title: fileName,
					user_id: userId,
					description: "",
					ogImage: storageData?.publicUrl,
					category_id: 0,
					type: fileType,
					meta_data: {
						img_caption: jsonResponse[0]?.generated_text,
					},
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
		response.status(500).json({
			success: false,
			error: "error in payload file data",
		});
	}
};
