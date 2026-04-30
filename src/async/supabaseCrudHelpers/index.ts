import { GoogleGenAI } from "@google/genai";

import type { GetMediaTypeOutputSchema } from "@/app/api/v2/bookmarks/get/get-media-type/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";

import { GEMINI_MODEL, V2_GET_MEDIA_TYPE_API } from "../../utils/constants";

// share

// profiles

// auth

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut = async (supabase: SupabaseClient<any, "public", any>) => {
  await supabase.auth.signOut({ scope: "local" });
};

type GetMediaTypeResponse = z.infer<typeof GetMediaTypeOutputSchema>;

export const getMediaType = async (url: string): Promise<null | string> => {
  try {
    const data = await api
      .get(V2_GET_MEDIA_TYPE_API, { searchParams: { url } })
      .json<GetMediaTypeResponse>();

    return data.mediaType ?? null;
  } catch {
    return null;
  }
};

export const validateApiKey = async (apikey: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: apikey });
    const response = await ai.models.generateContent({
      contents: ["Hey there!"],
      model: GEMINI_MODEL,
    });

    if (!response.text) {
      throw new Error("response not generated");
    }

    return response;
  } catch (error) {
    throw new Error("Invalid API key", { cause: error });
  }
};
