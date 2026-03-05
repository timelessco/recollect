// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import isNull from "lodash/isNull";

import {
	EVERYTHING_URL,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../utils/constants";
import { createServiceClient } from "../../utils/supabaseClient";

/**
 * Adds user as colaborator in DB
 */

// NOTE: check https://app.asana.com/0/1202643527638612/1205842037172641 for this apis short comings

type Data = {
	error: PostgrestError | string | null;
	success: string | null;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const token = request?.query?.token as string | undefined;

	if (!token) {
		response.status(400).json({ success: null, error: "Missing invite token" });
		return;
	}

	// using service client as this api should work irrespective of user auth
	const supabase = createServiceClient();

	// Look up the invite directly by token
	const { data, error } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.select("*")
		.eq("invite_token", token)
		.maybeSingle();

	if (error) {
		Sentry.captureException(error, {
			tags: { operation: "invite_lookup" },
		});
		response
			.status(500)
			.json({ success: null, error: "Error looking up invite" });
		return;
	}

	// if data is null then the invite token is invalid or was deleted
	if (isNull(data)) {
		response.status(404).json({
			success: null,
			error: "This invite is invalid or has been deleted",
		});
		return;
	}

	if (data.is_accept_pending !== true) {
		response.status(409).json({
			success: null,
			error: "The user is already a colaborator of this category",
		});
		return;
	}

	// Accept the invite atomically: match token + pending state to prevent replay races
	const { data: acceptedInvite, error: catError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.update({
			is_accept_pending: false,
			invite_token: null,
		})
		.eq("id", data.id)
		.eq("invite_token", token)
		.eq("is_accept_pending", true)
		.select("id")
		.maybeSingle();

	if (isNull(catError) && !isNull(acceptedInvite)) {
		// User has been added as a colaborator to the category
		response.redirect(`/${EVERYTHING_URL}`);
		return;
	}

	if (isNull(catError) && isNull(acceptedInvite)) {
		response.status(409).json({
			success: null,
			error: "This invite is no longer pending",
		});
		return;
	}

	if (catError?.code === "23503") {
		// if collab user does not have an existing account
		response.status(500).json({
			success: null,
			error:
				"You do not have an existing account. Please create one and open the invite link again.",
		});
		return;
	}

	console.error("Error accepting invite:", catError);
	Sentry.captureException(catError, {
		tags: { operation: "invite_accept" },
	});
	response.status(500).json({
		success: null,
		error: "Failed to accept invite",
	});
}
