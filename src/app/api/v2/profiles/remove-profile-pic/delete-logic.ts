import {
	R2_MAIN_BUCKET_NAME,
	STORAGE_USER_PROFILE_PATH,
} from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

export interface DeleteProfilePicProps {
	userId: string;
}

function toErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}

	return JSON.stringify(err);
}

export async function deleteProfilePic(
	props: DeleteProfilePicProps,
): Promise<void> {
	const { userId } = props;

	const { data: list, error: listError } = await storageHelpers.listObjects(
		R2_MAIN_BUCKET_NAME,
		`${STORAGE_USER_PROFILE_PATH}/${userId}/`,
	);

	if (listError !== null) {
		throw new Error(
			`Failed to list profile pictures: ${toErrorMessage(listError)}`,
		);
	}

	const filesToRemove =
		list && list.length > 0 ? list.map((x) => `${x.Key}`) : [];

	if (filesToRemove.length > 0) {
		const { error: deleteError } = await storageHelpers.deleteObjects(
			R2_MAIN_BUCKET_NAME,
			filesToRemove,
		);

		if (deleteError !== null) {
			throw new Error(
				`Failed to delete profile pictures: ${toErrorMessage(deleteError)}`,
			);
		}
	}

	const { error: folderDeleteError } = await storageHelpers.deleteObjects(
		R2_MAIN_BUCKET_NAME,
		[`${STORAGE_USER_PROFILE_PATH}/${userId}/`],
	);

	if (folderDeleteError !== null) {
		throw new Error(
			`Failed to delete profile folder: ${toErrorMessage(folderDeleteError)}`,
		);
	}
}
