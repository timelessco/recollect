import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UploadProfilePicPayload } from "../../../types/apiTypes";
import type { UploadProfilePicOutputSchema } from "@/app/api/v2/settings/upload-profile-pic/schema";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  USER_PROFILE,
  USER_PROFILE_PIC,
  V2_UPLOAD_PROFILE_PIC_API,
} from "../../../utils/constants";

type UploadProfilePicResponse = z.infer<typeof UploadProfilePicOutputSchema>;

export default function useUploadProfilePicMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const uploadProfilePicMutation = useMutation({
    mutationFn: ({ file }: UploadProfilePicPayload) => {
      const formData = new FormData();
      formData.append("file", file);
      return api
        .post(V2_UPLOAD_PROFILE_PIC_API, { body: formData })
        .json<UploadProfilePicResponse>();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE_PIC, session?.user?.email],
      });
    },
  });
  return { uploadProfilePicMutation };
}
