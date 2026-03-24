import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";

import { requireAuth } from "@/lib/supabase/api";

import { apiError, apiSuccess, parseBody, parseQuery } from "./response";

// Context types for handlers
interface AuthHandlerContext<TInput> {
  data: TInput;
  route: string;
  supabase: SupabaseClient<Database>;
  user: User;
}

interface PublicHandlerContext<TInput> {
  input: TInput;
  route: string;
}

// Config types
interface AuthHandlerConfig<TInput, TOutput> {
  handler: (
    ctx: AuthHandlerContext<TInput>,
  ) => NextResponse | Promise<NextResponse | TOutput> | TOutput;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  route: string;
}

interface PublicHandlerConfig<TInput, TOutput> {
  handler: (
    ctx: PublicHandlerContext<TInput>,
  ) => NextResponse | Promise<NextResponse | TOutput> | TOutput;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  route: string;
}

export interface HandlerConfig {
  factoryName: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  route: string;
}

type HandlerFn = ((request: NextRequest) => Promise<NextResponse>) & {
  config: HandlerConfig;
};

// ============================================================
// Internal helpers
// ============================================================

function parseInput<TInput>(
  request: NextRequest,
  schema: z.ZodType<TInput>,
  route: string,
  method: "body" | "query",
) {
  if (method === "query") {
    return parseQuery({ request, route, schema });
  }

  return parseBody({ request, route, schema });
}

function createPublicHandlerInternal<TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
  factoryName: string,
  method: "body" | "query",
): HandlerFn {
  const { handler, inputSchema, outputSchema, route } = config;

  const fn = async (request: NextRequest) => {
    try {
      const parsed = await parseInput(request, inputSchema, route, method);
      if (parsed.errorResponse) {
        return parsed.errorResponse;
      }

      const result = await handler({ input: parsed.data, route });

      if (result instanceof NextResponse) {
        return result;
      }

      return apiSuccess({ data: result, route, schema: outputSchema });
    } catch (error) {
      return apiError({
        error,
        message: "An unexpected error occurred",
        operation: `${route}_unexpected`,
        route,
      });
    }
  };

  fn.config = { factoryName, inputSchema, outputSchema, route };

  return fn;
}

function createAuthHandlerInternal<TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
  factoryName: string,
  method: "body" | "query",
): HandlerFn {
  const { handler, inputSchema, outputSchema, route } = config;

  const fn = async (request: NextRequest) => {
    try {
      const auth = await requireAuth(route);
      if (auth.errorResponse) {
        return auth.errorResponse;
      }

      const parsed = await parseInput(request, inputSchema, route, method);
      if (parsed.errorResponse) {
        return parsed.errorResponse;
      }

      const { supabase, user } = auth;
      const result = await handler({
        data: parsed.data,
        route,
        supabase,
        user,
      });

      if (result instanceof NextResponse) {
        return result;
      }

      return apiSuccess({ data: result, route, schema: outputSchema });
    } catch (error) {
      return apiError({
        error,
        message: "An unexpected error occurred",
        operation: `${route}_unexpected`,
        route,
      });
    }
  };

  fn.config = { factoryName, inputSchema, outputSchema, route };

  return fn;
}

// ============================================================
// Public Handlers (no auth)
// ============================================================

export const createGetApiHandler = <TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => createPublicHandlerInternal(config, "createGetApiHandler", "query");

export const createPostApiHandler = <TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => createPublicHandlerInternal(config, "createPostApiHandler", "body");

// ============================================================
// Authenticated Handlers (with auth)
// ============================================================

export const createGetApiHandlerWithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createGetApiHandlerWithAuth", "query");

export const createPostApiHandlerWithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPostApiHandlerWithAuth", "body");

export const createPatchApiHandlerWithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPatchApiHandlerWithAuth", "body");

export const createPutApiHandlerWithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPutApiHandlerWithAuth", "body");

export const createDeleteApiHandlerWithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createDeleteApiHandlerWithAuth", "body");

// ============================================================
// Secret-authenticated Handlers
// ============================================================

type SecretHandlerConfig<TInput, TOutput> = PublicHandlerConfig<TInput, TOutput> & {
  secretEnvVar: string;
};

function createSecretHandlerInternal<TInput, TOutput>(
  config: SecretHandlerConfig<TInput, TOutput>,
  factoryName: string,
  method: "body" | "query",
): HandlerFn {
  const { handler, inputSchema, outputSchema, route, secretEnvVar } = config;

  const fn = async (request: NextRequest) => {
    try {
      // process.env used intentionally — dynamic process.env[secretEnvVar] lookup, not statically analyzable
      const secret = process.env[secretEnvVar];
      if (!secret) {
        console.error(`[${route}] ${secretEnvVar} is not configured`);
        return NextResponse.json(
          { data: null, error: "Server configuration error" },
          { status: 500 },
        );
      }

      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
      }

      const parsed = await parseInput(request, inputSchema, route, method);
      if (parsed.errorResponse) {
        return parsed.errorResponse;
      }

      const result = await handler({ input: parsed.data, route });

      if (result instanceof NextResponse) {
        return result;
      }

      return apiSuccess({ data: result, route, schema: outputSchema });
    } catch (error) {
      return apiError({
        error,
        message: "An unexpected error occurred",
        operation: `${route}_unexpected`,
        route,
      });
    }
  };

  fn.config = { factoryName, inputSchema, outputSchema, route };

  return fn;
}

export const createGetApiHandlerWithSecret = <TInput, TOutput>(
  config: SecretHandlerConfig<TInput, TOutput>,
): HandlerFn => createSecretHandlerInternal(config, "createGetApiHandlerWithSecret", "query");

export const createPostApiHandlerWithSecret = <TInput, TOutput>(
  config: SecretHandlerConfig<TInput, TOutput>,
): HandlerFn => createSecretHandlerInternal(config, "createPostApiHandlerWithSecret", "body");
