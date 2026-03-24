import type { NextApiRequest, NextApiResponse } from "next";

import CryptoJS from "crypto-js";
import { z } from "zod";

import { env } from "@/env/server";

import { validateApiKey } from "../../../async/supabaseCrudHelpers";
import { PROFILES } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

const bodySchema = z.object({
  apikey: z.string({
    error: "API key is required",
  }),
});

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const supabase = apiSupabaseClient(request, response);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    response.status(401).json({ error: "Unauthorized user" });
    return;
  }

  const parsed = bodySchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      details: parsed.error.issues.map((issue) => issue.message),
      error: "Invalid request body",
    });
    return;
  }

  const { apikey } = parsed.data;
  const userId = user.id;

  try {
    await validateApiKey(apikey);
  } catch (error) {
    console.error(error);
    response.status(400).json({ error: "Invalid API key" });
    return;
  }

  try {
    const encryptedApiKey = CryptoJS.AES.encrypt(apikey, env.API_KEY_ENCRYPTION_KEY).toString();

    const { data: DataResponse, error: ErrorResponse } = await supabase.from(PROFILES).upsert({
      api_key: encryptedApiKey,
      id: userId,
    });

    if (ErrorResponse) {
      console.error(ErrorResponse);
      response.status(500).json({ error: "Database error" });
      return;
    }

    response.status(200).json({
      data: DataResponse,
      message: "API key saved successfully",
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  }
}
