// you might want to use regular 'fs' and not a promise one
import { promises as fs } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import { verify } from "jsonwebtoken";
import { isNull } from "lodash";

import { type UploadFileApiResponse } from "../../../types/apiTypes";
import { FILES_STORAGE_NAME } from "../../../utils/constants";
import { supabase } from "../../../utils/supabaseClient";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
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
		files: { file?: { filepath?: string } };
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

	let contents;

	if (data?.files?.file?.filepath) {
		contents = await fs.readFile(data?.files?.file?.filepath, {
			encoding: "base64",
		});
	}

	if (contents) {
		const { error: storageError } = await supabase.storage
			.from(FILES_STORAGE_NAME)
			.upload(`public/test-img153`, decode(contents), {
				contentType: "image/jpg",
			});

		if (isNull(storageError)) {
			response.status(200).json({ success: true, error: null });
		} else {
			response.status(500).json({ success: false, error: storageError });
		}
	} else {
		response.status(500).json({
			success: false,
			error: "error in payload file data",
		});
	}
};
