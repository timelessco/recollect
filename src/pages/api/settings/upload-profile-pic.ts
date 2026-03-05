// TODO: Fix this in priority
/* eslint-disable @typescript-eslint/no-base-to-string */

import { Readable } from "node:stream";
import { type NextApiRequest, type NextApiResponse } from "next";
import { decode } from "base64-arraybuffer";
import { isEmpty, isNull } from "lodash";
import isNil from "lodash/isNil";
import uniqid from "uniqid";

import {
	type ProfilesTableTypes,
	type UploadProfilePicApiResponse,
} from "../../../types/apiTypes";
import {
	PROFILES,
	R2_MAIN_BUCKET_NAME,
	STORAGE_USER_PROFILE_PATH,
} from "../../../utils/constants";
import { parseUploadFileName } from "../../../utils/helpers";
import { storageHelpers } from "../../../utils/storageClient";
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
	const { data: list, error: listError } = await storageHelpers.listObjects(
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
		const { error: deleteError } = await storageHelpers.deleteObjects(
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

	const { error: folderDeleteError } = await storageHelpers.deleteObjects(
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

/**
 * Parses multipart form data from a Pages Router request using the Web Request API.
 * Converts the Node.js IncomingMessage stream to a Web Request to use native formData().
 */
async function parseFormData(request: NextApiRequest) {
	const headers: Array<[string, string]> = [];
	for (const [name, value] of Object.entries(request.headers)) {
		if (value === null || value === undefined) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				headers.push([name, item]);
			}
		} else {
			headers.push([name, value]);
		}
	}

	const webStream = Readable.toWeb(request) as ReadableStream<
		Uint8Array<ArrayBuffer>
	>;
	const webRequest = new Request("http://localhost", {
		method: request.method,
		headers,
		body: webStream,
		// @ts-expect-error -- Node.js supports duplex but types don't expose it
		duplex: "half",
	});

	return await webRequest.formData();
}

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadProfilePicApiResponse>,
) => {
	const supabase = apiSupabaseClient(request, response);

	let formData: FormData;
	try {
		formData = await parseFormData(request);
	} catch {
		response.status(400).json({
			success: false,
			error: "Invalid or missing multipart form data",
		});
		return;
	}

	const file = formData.get("file");

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	let contents: string | undefined;

	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		contents = Buffer.from(arrayBuffer).toString("base64");
	}

	const parsedFileName =
		file instanceof File && file.name ? parseUploadFileName(file.name) : "";
	const fileName = parsedFileName || `${uniqid.time()}`;
	const fileType = file instanceof File ? file.type : undefined;

	if (contents) {
		await deleteLogic(response, userId);
		const { error: storageError } = await storageHelpers.uploadObject(
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

		const { data: storageData, error: publicUrlError } =
			storageHelpers.getPublicUrl(
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
