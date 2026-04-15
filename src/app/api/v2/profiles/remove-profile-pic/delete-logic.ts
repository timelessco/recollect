import { RecollectApiError } from "@/lib/api-helpers/errors";
import { R2_MAIN_BUCKET_NAME, STORAGE_USER_PROFILE_PATH } from "@/utils/constants";
import { storageHelpers } from "@/utils/storageClient";

export interface DeleteProfilePicProps {
  userId: string;
}

export async function deleteProfilePic(props: DeleteProfilePicProps): Promise<void> {
  const { userId } = props;

  const { data: list, error: listError } = await storageHelpers.listObjects(
    R2_MAIN_BUCKET_NAME,
    `${STORAGE_USER_PROFILE_PATH}/${userId}/`,
  );

  if (listError !== null) {
    throw new RecollectApiError("service_unavailable", {
      cause: listError,
      message: "Failed to list profile pictures",
      operation: "delete_profile_pic",
    });
  }

  const filesToRemove = list && list.length > 0 ? list.map((x) => `${x.Key}`) : [];

  if (filesToRemove.length > 0) {
    const { error: deleteError } = await storageHelpers.deleteObjects(
      R2_MAIN_BUCKET_NAME,
      filesToRemove,
    );

    if (deleteError !== null) {
      throw new RecollectApiError("service_unavailable", {
        cause: deleteError,
        message: "Failed to delete profile pictures",
        operation: "delete_profile_pic",
      });
    }
  }

  const { error: folderDeleteError } = await storageHelpers.deleteObjects(R2_MAIN_BUCKET_NAME, [
    `${STORAGE_USER_PROFILE_PATH}/${userId}/`,
  ]);

  if (folderDeleteError !== null) {
    throw new RecollectApiError("service_unavailable", {
      cause: folderDeleteError,
      message: "Failed to delete profile folder",
      operation: "delete_profile_pic",
    });
  }
}
