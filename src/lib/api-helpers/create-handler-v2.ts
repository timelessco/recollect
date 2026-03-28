import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";

import { createApiClient, getApiUser } from "@/lib/supabase/api";

import { RecollectApiError } from "./errors";
import { getServerContext } from "./server-context";

// Re-export for route consumers and OpenAPI scanner
export { createAxiomRouteHandler } from "./axiom";
export type { HandlerConfig } from "./create-handler";

// ============================================================
// Types
// ============================================================

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
    auth: "none" | "required";
    contract: "v2";
    factoryName: string;
    inputSchema: z.ZodType;
    outputSchema: z.ZodType;
    route: string;
  };
};

// ============================================================
// Input parsing (internal)
// ============================================================

function isBodyMethod(method: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  _route: string,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new RecollectApiError("bad_request", {
      message: "Invalid JSON in request body",
    });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const [firstError] = parsed.error.issues;
    throw new RecollectApiError("bad_request", {
      message: firstError?.message ?? "Invalid input",
      context: { errors: parsed.error.issues },
    });
  }

  return parsed.data;
}

function parseRequestQuery<T>(request: NextRequest, schema: z.ZodType<T>, _route: string): T {
  const { searchParams } = request.nextUrl;
  const params = Object.fromEntries(searchParams.entries());

  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const [firstError] = parsed.error.issues;
    throw new RecollectApiError("bad_request", {
      message: firstError?.message ?? "Invalid query parameters",
      context: { errors: parsed.error.issues },
    });
  }

  return parsed.data;
}

// ============================================================
// withAuth — authenticated handler
// ============================================================

export function withAuth<TInput, TOutput>(config: AuthHandlerConfig<TInput, TOutput>): HandlerFn {
  const { handler, inputSchema, outputSchema, route } = config;

  const fn = async (request: NextRequest) => {
    try {
      const { supabase, token } = await createApiClient();
      const {
        data: { user },
        error: userError,
      } = await getApiUser(supabase, token);

      if (userError) {
        throw new RecollectApiError("unauthorized", { message: userError.message });
      }

      if (!user) {
        throw new RecollectApiError("unauthorized", { message: "Not authenticated" });
      }

      // Set user_id in ALS context (available to downstream code and outer Axiom layer)
      const ctx = getServerContext();
      if (ctx) {
        ctx.user_id = user.id;
      }

      const data = isBodyMethod(request.method)
        ? await parseRequestBody(request, inputSchema, route)
        : parseRequestQuery(request, inputSchema, route);

      const result = await handler({
        data,
        route,
        supabase,
        user,
      });

      // Escape hatch: handler returns NextResponse directly
      if (result instanceof NextResponse) {
        return result;
      }

      const validated = outputSchema.safeParse(result);
      if (!validated.success) {
        // Known errors: re-throw because outputSchema validation failures are always a bug in our code
        // Never user error
        throw new Error(
          `[${route}] Output validation failed: ${JSON.stringify(validated.error.issues)}`,
        );
      }

      return NextResponse.json(validated.data);
    } catch (error) {
      // Known errors: add context to wide event, return HTTP response (NEVER reaches Sentry)
      if (error instanceof RecollectApiError) {
        const ctx = getServerContext();
        if (ctx?.fields) {
          Object.assign(ctx.fields, error.toLogContext());
        }
        return NextResponse.json(error.toResponse(), { status: error.status });
      }
      // Unknown errors: re-throw for outer layer (Axiom onError + Sentry onRequestError)
      throw error;
    }
  };

  fn.config = {
    auth: "required" as const,
    contract: "v2" as const,
    factoryName: "withAuth",
    inputSchema,
    outputSchema,
    route,
  };

  return fn;
}

// ============================================================
// withPublic — unauthenticated handler
// ============================================================

export function withPublic<TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
): HandlerFn {
  const { handler, inputSchema, outputSchema, route } = config;

  const fn = async (request: NextRequest) => {
    try {
      const data = isBodyMethod(request.method)
        ? await parseRequestBody(request, inputSchema, route)
        : parseRequestQuery(request, inputSchema, route);

      const result = await handler({
        input: data,
        route,
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
      if (error instanceof RecollectApiError) {
        const ctx = getServerContext();
        if (ctx?.fields) {
          Object.assign(ctx.fields, error.toLogContext());
        }
        return NextResponse.json(error.toResponse(), { status: error.status });
      }
      throw error;
    }
  };

  fn.config = {
    auth: "none" as const,
    contract: "v2" as const,
    factoryName: "withPublic",
    inputSchema,
    outputSchema,
    route,
  };

  return fn;
}
