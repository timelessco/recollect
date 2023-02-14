// Thanks to https://github.com/t3-oss/create-t3-app/
// @ts-check
import { clientEnv, clientSchema } from "./schema.js";

export const isNonNullable = /** @type {<T>(x: T) => x is NonNullable<T>} */ (
  x => x != null
);

export const formatErrors = (
  /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
  errors,
) => {
  return Object.entries(errors)
    .map(([name, value]) => {
      if (value && "_errors" in value) {
        return `${name}: ${value._errors.join(", ")}\n`;
      }

      return null;
    })
    .filter(isNonNullable);
};

const parsedClientEnv = clientSchema.safeParse(clientEnv);

if (!parsedClientEnv.success) {
  console.error(
    "❌ Invalid environment variables:\n",
    ...formatErrors(parsedClientEnv.error.format()),
  );
  throw new Error("Invalid environment variables");
}

Object.keys(parsedClientEnv.data).forEach(key => {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.warn(
      `❌ Invalid public environment variable name: ${key}. It must begin with 'NEXT_PUBLIC_'`,
    );

    throw new Error("Invalid public environment variable name");
  }
});

export const env = parsedClientEnv.data;
