import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  V2_SEND_COLLABORATION_EMAIL_API,
} from "../../../utils/constants";

interface SendCollaborationEmailPayload {
  category_id: number;
  edit_access: boolean;
  emailList: string[];
  hostUrl: string;
}

export default function useSendCollaborationEmailInviteMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const sendCollaborationEmailInviteMutation = useMutation({
    mutationFn: (payload: SendCollaborationEmailPayload) =>
      api.post(V2_SEND_COLLABORATION_EMAIL_API, { json: payload }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [SHARED_CATEGORIES_TABLE_NAME],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { sendCollaborationEmailInviteMutation };
}
