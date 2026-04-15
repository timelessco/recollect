import uniqid from "uniqid";

import type { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { GET_NAME_FROM_EMAIL_PATTERN, PROFILES } from "@/utils/constants";

import { FetchUserProfileInputSchema, FetchUserProfileOutputSchema } from "./schema";

function getUserNameFromEmail(email: string): null | string {
  if (email) {
    const match = email.match(GET_NAME_FROM_EMAIL_PATTERN);
    return match?.[1]?.replace(".", "-") ?? null;
  }

  return null;
}

type EnrichedProfile = z.infer<typeof FetchUserProfileOutputSchema>[number];

function normalizePlan(raw: unknown): EnrichedProfile["plan"] {
  if (raw === "free" || raw === "plus" || raw === "pro") {
    return raw;
  }

  return "free";
}

type RawProfileRow = Record<string, unknown> & {
  category_order?: null | (null | number | string)[];
  plan?: unknown;
  plan_updated_at?: null | string;
  subscription_current_period_end?: null | string;
  subscription_status?: null | string;
};

// PostgREST serializes Postgres `int8` arrays as JSON strings (to preserve
// 64-bit precision), so `category_order` arrives as `["379"]`, not `[379]`.
// Sparse positions in the array surface as `null` — drop them rather than
// coerce to 0, which would silently inject "Uncategorized" into the order.
function coerceCategoryOrder(raw: RawProfileRow["category_order"]): null | number[] {
  if (!raw) {
    return null;
  }

  const result: number[] = [];
  for (const value of raw) {
    if (value === null || value === undefined) {
      continue;
    }

    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(numeric)) {
      result.push(numeric);
    }
  }

  return result;
}

/* oxlint-disable @typescript-eslint/no-unsafe-type-assertion -- DB row shape is validated at runtime via outputSchema.safeParse in the factory */
function enrichProfiles(
  rows: null | RawProfileRow[],
  userCreatedAt: string,
): EnrichedProfile[] | null {
  if (!rows) {
    return rows;
  }

  return rows.map(
    (row) =>
      ({
        ...row,
        category_order: coerceCategoryOrder(row.category_order),
        freeTierCutoffAt: userCreatedAt,
        plan: normalizePlan(row.plan),
        planChangedAt: row.plan_updated_at ?? userCreatedAt,
        subscription_current_period_end: row.subscription_current_period_end ?? null,
        subscription_status: row.subscription_status ?? null,
      }) as EnrichedProfile,
  );
}
/* oxlint-enable @typescript-eslint/no-unsafe-type-assertion */

const ROUTE = "v2-profiles-fetch-user-profile";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const userCreatedAt = user.created_at;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data: profileData, error } = await supabase
        .from(PROFILES)
        .select("*")
        .eq("id", userId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch user profile",
          operation: "profile_fetch",
        });
      }

      const profile = profileData?.at(0);
      if (!profile) {
        return enrichProfiles(profileData, userCreatedAt);
      }

      async function syncProfilePic(avatar: string) {
        const { data: updated, error: updateError } = await supabase
          .from(PROFILES)
          .update({ profile_pic: avatar })
          .match({ id: userId })
          .select("*");

        if (updateError) {
          throw new RecollectApiError("service_unavailable", {
            cause: updateError,
            message: "Failed to update profile picture",
            operation: "profile_pic_update",
          });
        }

        return updated;
      }

      async function assignUsername(email: string) {
        const newUsername = getUserNameFromEmail(email);
        if (!newUsername) {
          return null;
        }

        const { data: existingUsers, error: checkError } = await supabase
          .from(PROFILES)
          .select("user_name")
          .eq("user_name", newUsername);

        if (checkError) {
          throw new RecollectApiError("service_unavailable", {
            cause: checkError,
            message: "Failed to check username availability",
            operation: "username_check",
          });
        }

        const usernameToSet =
          existingUsers && existingUsers.length > 0
            ? `${newUsername}-${uniqid.time()}`
            : newUsername;

        const { data: usernameData, error: usernameError } = await supabase
          .from(PROFILES)
          .update({ user_name: usernameToSet })
          .match({ id: userId })
          .select("*");

        if (usernameError) {
          throw new RecollectApiError("service_unavailable", {
            cause: usernameError,
            message: "Failed to update username",
            operation: "username_update",
          });
        }

        return usernameData;
      }

      const picResult =
        !profile.profile_pic && data.avatar ? await syncProfilePic(data.avatar) : null;

      const usernameResult =
        profile.user_name === null && profile.email ? await assignUsername(profile.email) : null;

      if (ctx?.fields) {
        ctx.fields.synced_profile_pic = Boolean(picResult);
        ctx.fields.assigned_username = Boolean(usernameResult);
      }

      return enrichProfiles(usernameResult ?? picResult ?? profileData, userCreatedAt);
    },
    inputSchema: FetchUserProfileInputSchema,
    outputSchema: FetchUserProfileOutputSchema,
    route: ROUTE,
  }),
);
