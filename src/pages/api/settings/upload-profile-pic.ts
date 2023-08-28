// you might want to use regular 'fs' and not a promise one

import { promises as fileSystem } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import { verify } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isEmpty, isNull } from "lodash";
import isNil from "lodash/isNil";

import { type UploadProfilePicApiResponse } from "../../../types/apiTypes";
import { PROFILES, USER_PROFILE_STORAGE_NAME } from "../../../utils/constants";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadProfilePicApiResponse>,
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
		fields: { access_token?: string; category_id?: string };
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
				// throw new Error("ERROR");
			}
		},
	);

	// const categoryId = data?.fields?.category_id;

	// deletes all current profile pic in the users profile pic bucket
	const deleteLogic = async () => {
		const { data: list, error: listError } = await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.list(`public/${userId}`);

		if (!isNull(listError)) {
			response.status(500).json({
				success: false,
				error: listError,
			});
		}

		const filesToRemove =
			!isEmpty(list) && list
				? list?.map((x) => `public/${userId}/${x.name}`)
				: [];

		const { error: removeError } = await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.remove(filesToRemove);

		if (!isNil(removeError)) {
			response.status(500).json({
				success: false,
				error: removeError,
			});
		}
	};

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
		await deleteLogic();
		const { error: storageError } = await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.upload(`public/${userId}/${fileName}`, decode(contents), {
				contentType: fileType,
				upsert: true,
			});

		if (!isNil(storageError)) {
			response.status(500).json({
				success: false,
				error: storageError,
			});
		}

		const { data: storageData, error: publicUrlError } = supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.getPublicUrl(`public/${userId}/${fileName}`) as {
			data: { publicUrl: string };
			error: UploadProfilePicApiResponse["error"];
		};

		if (!isNil(publicUrlError)) {
			response.status(500).json({
				success: false,
				error: publicUrlError as unknown as string,
			});
		}

		const { error: databaseError } = await supabase
			.from(PROFILES)
			.update({ profile_pic: storageData?.publicUrl })
			.match({ id: userId });

		if (!isNil(databaseError)) {
			response.status(500).json({
				success: false,
				error: databaseError,
			});
		}

		response.status(200).json({
			success: true,
			error: null,
		});
	} else {
		response.status(500).json({
			success: false,
			error: "error in payload file data",
		});
	}
};
