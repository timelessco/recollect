/**
 * Type augmentation for server secrets still accessed via raw `process.env`.
 *
 * These can't use `@/env/server` because they're in files shared between
 * client and server (supabaseClient.ts, constants.ts, _app.tsx).
 *
 * The deleted `scripts/env/environment.d.ts` provided this globally via
 * typeRoots — this file restores type safety for the remaining raw usages.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly DEV_SUPABASE_SERVICE_KEY: string | undefined;
    readonly SUPABASE_SERVICE_KEY: string;
    readonly UMAMI_ID: string | undefined;
    readonly UMAMI_SRC: string | undefined;
  }
}
