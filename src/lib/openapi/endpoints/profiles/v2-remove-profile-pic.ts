/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2RemoveProfilePicSupplement = {
	path: "/v2/profiles/remove-profile-pic",
	method: "delete",
	tags: ["Profiles"],
	summary: "Remove authenticated user's profile picture",
	description:
		"Nullifies `profile_pic` in the profiles table and deletes the corresponding files from R2 storage. If no profile picture exists, the operation is idempotent — it succeeds without error.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"empty-body": {
			summary: "Empty request body",
			description: "No body fields are required — send an empty object.",
			value: {},
		},
	},
	responseExamples: {
		"pic-removed": {
			summary: "Profile picture removed",
			description:
				"Returns the updated `profile_pic` column value — always null after removal.",
			value: {
				data: [{ profile_pic: null }],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		401: { description: "Not authenticated" },
	},
} satisfies EndpointSupplement;
