import { PostgrestError } from "@supabase/supabase-js";

export interface SingleListData {
  id: number,
  inserted_at: string,
  is_completed: boolean,
  task: string,
  user_id: string
}

export interface FetchDataResponse {
  data: SingleListData[];
  error: PostgrestError | null;
}