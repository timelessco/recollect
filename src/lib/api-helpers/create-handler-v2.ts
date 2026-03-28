import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/types/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";

import { createApiClient, getApiUser } from "@/lib/supabase/api";

// Re-export for v2 route consumers (OpenAPI scanner compatibility)
export type { HandlerConfig } from "./create-handler";

// ============================================================
// Types
// ============================================================

interface ErrorHelperProps {
  cause: unknown;
  extra?: Record<string, unknown>;
  message: string;
  operation: string;
  status?: number;
}

interface WarnHelperProps {
  context?: Record<string, unknown>;
  message: string;
  status: number;
}

interface AuthHandlerContext<TInput> {
  data: TInput;
  error: (props: ErrorHelperProps) => NextResponse;
  route: string;
  supabase: SupabaseClient<Database>;
  user: User;
  warn: (props: WarnHelperProps) => NextResponse;
}

interface PublicHandlerContext<TInput> {
  error: (props: ErrorHelperProps) => NextResponse;
  input: TInput;
  route: string;
  warn: (props: WarnHelperProps) => NextResponse;
}

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

type HandlerFn = ((request: NextRequest) => Promise<NextResponse>) & {
  config: {
    factoryName: string;
    inputSchema: z.ZodType;
    outputSchema: z.ZodType;
    route: string;
  };
};

// ============================================================
// Auth
// ============================================================

type AuthResult =
  | { errorResponse: NextResponse; supabase: null; user: null }
  | { errorResponse: null; supabase: SupabaseClient<Database>; user: User };

async function authenticateRequest(route: string): Promise<AuthResult> {
  const { supabase, token } = await createApiClient();
  const {
    data: { user },
    error: userError,
  } = await getApiUser(supabase, token);

  if (userError) {
    console.warn(`[${route}] Auth error:`, userError);
    return {
      errorResponse: NextResponse.json({ error: userError.message }, { status: 400 }),
      supabase: null,
      user: null,
    };
  }

  if (!user) {
    console.warn(`[${route}] No user found in session`);
    return {
      errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      supabase: null,
      user: null,
    };
  }

  return { errorResponse: null, supabase, user };
}

// ============================================================
// Input validation
// ============================================================

type ParseResult<T> =
  | { data: null; errorResponse: NextResponse }
  | { data: T; errorResponse: null };

async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  route: string,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError) {
    console.warn(`[${route}] Invalid JSON in request body`, {
      error: parseError instanceof Error ? parseError.message : String(parseError),
    });
    return {
      data: null,
      errorResponse: NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const [firstError] = parsed.error.issues;
    const message = firstError?.message ?? "Invalid input";
    console.warn(`[${route}] ${message}`, { errors: parsed.error.issues });
    return {
      data: null,
      errorResponse: NextResponse.json({ error: message }, { status: 400 }),
    };
  }

  return { data: parsed.data, errorResponse: null };
}

function parseRequestQuery<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  route: string,
): ParseResult<T> {
  const { searchParams } = request.nextUrl;
  const params = Object.fromEntries(searchParams.entries());

  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const [firstError] = parsed.error.issues;
    const message = firstError?.message ?? "Invalid query parameters";
    console.warn(`[${route}] ${message}`, { errors: parsed.error.issues });
    return {
      data: null,
      errorResponse: NextResponse.json({ error: message }, { status: 400 }),
    };
  }

  return { data: parsed.data, errorResponse: null };
}

function parseInput<TInput>(
  request: NextRequest,
  schema: z.ZodType<TInput>,
  route: string,
  method: "body" | "query",
) {
  if (method === "query") {
    return parseRequestQuery(request, schema, route);
  }

  return parseRequestBody(request, schema, route);
}

// ============================================================
// Context helpers
// ============================================================

function createErrorHelper(route: string, userId?: string) {
  return (props: ErrorHelperProps): NextResponse => {
    const { cause, extra, message, operation, status = 500 } = props;
    console.error(`[${route}] ${message}`, { error: cause, ...extra });
    Sentry.captureException(cause, {
      extra,
      tags: { operation, ...(userId && { userId }) },
    });
    return NextResponse.json({ error: message }, { status });
  };
}

function createWarnHelper(route: string) {
  return (props: WarnHelperProps): NextResponse => {
    const { context, message, status } = props;
    console.warn(`[${route}] ${message}`, context);
    return NextResponse.json({ error: message }, { status });
  };
}

// ============================================================
// Internal factory functions
// ============================================================

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

      const result = await handler({
        error: createErrorHelper(route),
        input: parsed.data,
        route,
        warn: createWarnHelper(route),
      });

      if (result instanceof NextResponse) {
        return result;
      }

      const validated = outputSchema.safeParse(result);
      if (!validated.success) {
        throw new Error(
          `[${route}] Output validation failed: ${JSON.stringify(validated.error.issues)}`,
        );
      }

      return NextResponse.json(validated.data);
    } catch (error) {
      console.error(`[${route}] An unexpected error occurred`, { error });
      Sentry.captureException(error, {
        tags: { operation: `${route}_unexpected` },
      });
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
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
      const auth = await authenticateRequest(route);
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
        error: createErrorHelper(route, user.id),
        route,
        supabase,
        user,
        warn: createWarnHelper(route),
      });

      if (result instanceof NextResponse) {
        return result;
      }

      const validated = outputSchema.safeParse(result);
      if (!validated.success) {
        throw new Error(
          `[${route}] Output validation failed: ${JSON.stringify(validated.error.issues)}`,
        );
      }

      return NextResponse.json(validated.data);
    } catch (error) {
      console.error(`[${route}] An unexpected error occurred`, { error });
      Sentry.captureException(error, {
        tags: { operation: `${route}_unexpected` },
      });
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
  };

  fn.config = { factoryName, inputSchema, outputSchema, route };

  return fn;
}

// ============================================================
// Public Handlers (no auth)
// ============================================================

export const createGetApiHandlerV2 = <TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => createPublicHandlerInternal(config, "createGetApiHandlerV2", "query");

export const createPostApiHandlerV2 = <TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn => createPublicHandlerInternal(config, "createPostApiHandlerV2", "body");

// ============================================================
// Authenticated Handlers (with auth)
// ============================================================

export const createGetApiHandlerV2WithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createGetApiHandlerV2WithAuth", "query");

export const createPostApiHandlerV2WithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPostApiHandlerV2WithAuth", "body");

export const createPatchApiHandlerV2WithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPatchApiHandlerV2WithAuth", "body");

export const createPutApiHandlerV2WithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createPutApiHandlerV2WithAuth", "body");

export const createDeleteApiHandlerV2WithAuth = <TInput, TOutput>(
  config: AuthHandlerConfig<TInput, TOutput>,
): HandlerFn => createAuthHandlerInternal(config, "createDeleteApiHandlerV2WithAuth", "body");
