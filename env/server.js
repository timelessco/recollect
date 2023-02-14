// Thanks to https://github.com/t3-oss/create-t3-app/
// @ts-check
/**
 * This file is included in `/next.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */

import { env as clientEnv, formatErrors } from "./client.js";
import { serverEnv, serverSchema } from "./schema.js";

const _serverEnv = serverSchema.safeParse(serverEnv);

if (!_serverEnv.success) {
  console.error(
    "❌ Invalid environment variables:\n",
    ...formatErrors(_serverEnv.error.format()),
  );
  throw new Error("Invalid environment variables");
}

Object.keys(_serverEnv.data).forEach(key => {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ You are exposing a server-side env-variable:", key);

    throw new Error("You are exposing a server-side env-variable");
  }
});

export const env = { ..._serverEnv.data, ...clientEnv };
