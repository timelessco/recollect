import { type GetServerSideProps, type NextPage } from "next";
import * as Sentry from "@sentry/nextjs";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import { useMounted } from "../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabase/constants";
import Dashboard from "../pageComponents/dashboard";
import { DiscoverGuestView } from "../pageComponents/discover/DiscoverGuestView";
import { type SingleListData } from "../types/apiTypes";
import {
	DISCOVER_URL,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
} from "../utils/constants";

import { Spinner } from "@/components/spinner";

type CategoryPageProps = {
	isDiscover?: boolean;
	isAuthenticated?: boolean;
	discoverData?: SingleListData[];
};

const Home: NextPage<CategoryPageProps> = ({
	isDiscover,
	isAuthenticated,
	discoverData,
}) => {
	const isMounted = useMounted();

	if (isDiscover && !isAuthenticated && discoverData) {
		return <DiscoverGuestView discoverData={discoverData} />;
	}

	if (!isMounted) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner className="h-3 w-3 animate-spin" />
			</div>
		);
	}

	return <Dashboard />;
};

export const getServerSideProps: GetServerSideProps<CategoryPageProps> = async (
	context,
) => {
	const categoryId = context.params?.category_id as string;
	const isDiscover = categoryId === DISCOVER_URL;

	if (!isDiscover) {
		return {
			props: { isDiscover: false, isAuthenticated: true, discoverData: [] },
		};
	}

	// Create Supabase client for SSR
	const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return context.req.cookies
					? Object.entries(context.req.cookies).map(([name, value]) => ({
							name,
							value: value || "",
						}))
					: [];
			},
			setAll(cookiesToSet) {
				if (context.res) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							context.res.setHeader(
								"Set-Cookie",
								serializeCookieHeader(name, value, options),
							);
						}
					} catch {
						// Cookie setting may fail in certain Server Component contexts
						// Silently fail to prevent SSR errors
					}
				}
			},
		},
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const isAuthenticated = Boolean(user);

	if (!isAuthenticated) {
		try {
			// Query Supabase directly instead of HTTP fetch to own API
			const page = 0;
			const rangeStart = page * PAGINATION_LIMIT;
			const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

			const { data, error } = await supabase
				.from(MAIN_TABLE_NAME)
				.select(
					`
					id,
					inserted_at,
					title,
					url,
					description,
					ogImage,
					screenshot,
					category_id,
					trash,
					type,
					meta_data,
					sort_index,
					make_discoverable
				`,
				)
				.is("trash", null)
				.not("make_discoverable", "is", null)
				.order("make_discoverable", { ascending: false })
				.range(rangeStart, rangeEnd);

			if (error) {
				console.error(
					"[discover-ssr] Failed to fetch discoverable bookmarks:",
					error,
				);
				Sentry.captureException(error, {
					tags: { route: "discover-ssr" },
					extra: { categoryId, isAuthenticated },
				});
				return {
					props: {
						isDiscover: true,
						isAuthenticated: false,
						discoverData: [],
					},
				};
			}

			// Map data to SingleListData format with required fields
			// Type assertion needed as Supabase returns Json types and nested objects differently than our types
			const discoverData = (data?.map((item) => ({
				...item,
				addedTags: [],
				addedCategories: [],
			})) ?? []) as unknown as SingleListData[];

			return {
				props: {
					isDiscover: true,
					isAuthenticated: false,
					discoverData,
				},
			};
		} catch (error) {
			console.error(
				"[discover-ssr] Error fetching discoverable bookmarks:",
				error,
			);
			Sentry.captureException(error, {
				tags: { route: "discover-ssr" },
				extra: { categoryId, isAuthenticated },
			});
			return {
				props: {
					isDiscover: true,
					isAuthenticated: false,
					discoverData: [],
				},
			};
		}
	}

	return {
		props: {
			isDiscover: true,
			isAuthenticated: true,
			discoverData: [],
		},
	};
};

export default Home;
