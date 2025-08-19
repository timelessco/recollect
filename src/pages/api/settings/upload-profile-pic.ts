// you might want to use regular 'fs' and not a promise one

import { promises as fileSystem } from "fs";
import { type NextApiRequest, type NextApiResponse } from "next";
import {
	DeleteObjectCommand,
	ListBucketsCommand,
	ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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
import {
	PROFILES,
	R2_MAIN_BUCKET_NAME,
	STORAGE_USER_PROFILE_PATH,
	USER_PROFILE_STORAGE_NAME,
} from "../../../utils/constants";
import { parseUploadFileName } from "../../../utils/helpers";
import { r2Client, r2Helpers } from "../../../utils/r2Client";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

// deletes all current profile pic in the users profile pic bucket
export const deleteLogic = async (
	response: NextApiResponse,
	userId: ProfilesTableTypes["id"],
) => {
	const { data: list, error: listError } = await r2Helpers.listObjects(
		R2_MAIN_BUCKET_NAME,
		`${STORAGE_USER_PROFILE_PATH}/${userId}/`,
	);

	if (!isNull(listError)) {
		response.status(500).json({
			success: false,
			error: String(listError),
		});
		throw new Error("ERROR: list error!!");
	}

	const filesToRemove =
		!isEmpty(list) && list ? list?.map((x) => `${x.Key}`) : [];

	if (!isNil(filesToRemove) && !isEmpty(filesToRemove)) {
		const { error: deleteError } = await r2Helpers.deleteObjects(
			R2_MAIN_BUCKET_NAME,
			filesToRemove,
		);

		if (!isNil(deleteError)) {
			response.status(500).json({
				success: false,
				error: String(deleteError),
			});
			throw new Error("ERROR: delete error");
		}
	}

	const { error: folderDeleteError } = await r2Helpers.deleteObjects(
		R2_MAIN_BUCKET_NAME,
		[`${STORAGE_USER_PROFILE_PATH}/${userId}/`],
	);

	if (!isNil(folderDeleteError)) {
		response.status(500).json({
			success: false,
			error: String(folderDeleteError),
		});
		throw new Error("ERROR: folder delete error");
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
		await deleteLogic(response, userId);
		const { error: storageError } = await r2Helpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			`${STORAGE_USER_PROFILE_PATH}/${userId}/${fileName}`,
			new Uint8Array(decode(contents)),
			fileType,
		);

		if (!isNil(storageError)) {
			response.status(500).json({
				success: false,
				error: String(storageError),
			});

			throw new Error("ERROR: storage error");
		}

		const { data: storageData, error: publicUrlError } = r2Helpers.getPublicUrl(
			`${STORAGE_USER_PROFILE_PATH}/${userId}/${fileName}`,
		);

		if (!isNil(publicUrlError)) {
			response.status(500).json({
				success: false,
				error: String(publicUrlError),
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
