import { useEffect } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { createClient } from "../../../utils/supabaseClient";
import { getCategorySlugFromRouter } from "../../../utils/url";

import { DISCOVER_URL, LOGIN_URL } from "@/utils/constants";

export function useDashboardSession() {
	const supabase = createClient();
	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);
	const setSession = useSupabaseSession((state) => state.setSession);
	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		const fetchSession = async () => {
			const { data, error } = await supabase.auth.getUser();

			const isDiscoverRoute =
				categorySlug === DISCOVER_URL ||
				window.location.pathname.startsWith(`/${DISCOVER_URL}`);
			if ((error || !data?.user) && !isDiscoverRoute) {
				const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
				window.location.href = `/${LOGIN_URL}?next=${encodeURIComponent(currentPath)}`;
				return;
			}

			if (data?.user) {
				setSession({ user: data.user });
			} else {
				setSession(undefined);
			}
		};

		void fetchSession();
	}, [setSession, supabase.auth, categorySlug]);

	return { session, categorySlug };
}

type UseDashboardRouteInvalidationParams = {
	session: { user?: { id?: string } | null } | undefined;
	CATEGORY_ID: string | number | null;
	sortBy: string | undefined;
};

export function useDashboardRouteInvalidation({
	session,
	CATEGORY_ID,
	sortBy,
}: UseDashboardRouteInvalidationParams) {
	const queryClient = useQueryClient();

	useEffect(() => {
		const userId = session?.user?.id;
		if (userId && CATEGORY_ID !== DISCOVER_URL) {
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, userId, CATEGORY_ID, sortBy],
			});
		}
	}, [CATEGORY_ID, sortBy, session?.user?.id, queryClient]);
}
