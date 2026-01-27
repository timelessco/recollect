import * as Sentry from "@sentry/nextjs";
import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import {
	R2_MAIN_BUCKET_NAME,
	STORAGE_SCREENSHOT_IMAGES_PATH,
	STORAGE_SCREENSHOT_VIDEOS_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

type MediaUploadKind = "image" | "video";

type UploadMediaOptions = {
	kind: MediaUploadKind;
	data: Uint8Array;
	uploadUserId: string;
	contentType: string;
};

const uploadMedia = async ({
	kind,
	data,
	uploadUserId,
	contentType,
}: UploadMediaOptions): Promise<string | null> => {
	const fileName =
		kind === "image"
			? `img-${uniqid?.time()}.jpg`
			: `video-${uniqid?.time()}.mp4`;

	const basePath =
		kind === "image"
			? STORAGE_SCREENSHOT_IMAGES_PATH
			: STORAGE_SCREENSHOT_VIDEOS_PATH;

	const storagePath = `${basePath}/${uploadUserId}/${fileName}`;

	const { error: uploadError } = await storageHelpers.uploadObject(
		R2_MAIN_BUCKET_NAME,
		storagePath,
		data,
		contentType,
	);

	if (uploadError) {
		const operation =
			kind === "image" ? "storage_upload" : "video_storage_upload";

		console.error("Media storage upload failed:", {
			operation,
			kind,
			error: uploadError,
		});

		Sentry.captureException(uploadError, {
			tags: {
				operation,
				userId: uploadUserId,
			},
			extra: {
				storagePath,
				kind,
			},
		});
		return null;
	}

	const { data: storageData } = storageHelpers.getPublicUrl(storagePath);

	return storageData?.publicUrl || null;
};

export const upload = async (
	base64info: string,
	uploadUserId: string,
): Promise<string | null> =>
	await uploadMedia({
		kind: "image",
		data: new Uint8Array(decode(base64info)),
		uploadUserId,
		contentType: "image/jpg",
	});

export const uploadVideo = async (
	videoBuffer: ArrayBuffer,
	uploadUserId: string,
	contentType: string,
): Promise<string | null> =>
	await uploadMedia({
		kind: "video",
		data: new Uint8Array(videoBuffer),
		uploadUserId,
		contentType,
	});
