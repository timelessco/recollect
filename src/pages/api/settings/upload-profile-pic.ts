// you might want to use regular 'fs' and not a promise one

import { promises as fileSystem } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type SupabaseClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import { isEmpty, isNull } from "lodash";
import isNil from "lodash/isNil";
import uniqid from "uniqid";

import {
	type ParsedFormDataType,
	type ProfilesTableTypes,
	type UploadProfilePicApiResponse,
} from "../../../types/apiTypes";
import { PROFILES, USER_PROFILE_STORAGE_NAME } from "../../../utils/constants";
import { parseUploadFileName } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

// deletes all current profile pic in the users profile pic bucket
export const deleteLogic = async (
	supabase: SupabaseClient,
	response: NextApiResponse,
	userId: ProfilesTableTypes["id"],
) => {
	const { data: list, error: listError } = await supabase.storage
		.from(USER_PROFILE_STORAGE_NAME)
		.list(`public/${userId}`);

	if (!isNull(listError)) {
		response.status(500).json({
			success: false,
			error: listError,
		});
		throw new Error("ERROR: list error");
	}

	const filesToRemove =
		!isEmpty(list) && list
			? list?.map((x) => `public/${userId}/${x.name}`)
			: [];

	if (!isNil(filesToRemove) && !isEmpty(filesToRemove)) {
		const { error: removeError } = await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.remove(filesToRemove);

		if (!isNil(removeError)) {
			response.status(500).json({
				success: false,
				error: removeError,
			});
			throw new Error("ERROR: remove error");
		}
	}
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadProfilePicApiResponse>,
) => {
	const supabase = apiSupabaseClient(request, response);

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
			category_id?: ParsedFormDataType["fields"]["category_id"];
			user_id?: ParsedFormDataType["fields"]["user_id"];
		};
		files: ParsedFormDataType["files"];
	};

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	let contents;

	if (data?.files?.file && data?.files?.file[0]?.filepath) {
		contents = await fileSystem.readFile(data?.files?.file[0]?.filepath, {
			encoding: "base64",
		});
	}

	const fileName = data?.files?.file?.[0]?.originalFilename
		? parseUploadFileName(data?.files?.file?.[0]?.originalFilename)
		: `${uniqid.time()}`;
	const fileType = data?.files?.file?.[0]?.mimetype;

	if (contents) {
		await deleteLogic(supabase, response, userId);
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

			throw new Error("ERROR: storage error");
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

			throw new Error("ERROR: public url error");
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

			throw new Error("ERROR: DB error");
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

		throw new Error("ERROR: payload error");
	}
};
