import type { clientSchema, serverSchema } from "./schema.js";
import type { z } from "zod";

declare global {
  // By default, we do not want any namespace in Start UI [web] as it is more
  // error prone and not useful in front end applications.
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof clientSchema>, z.infer<typeof serverSchema> {}
  }
}
