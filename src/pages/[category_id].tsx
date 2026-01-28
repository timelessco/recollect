import { type GetServerSideProps, type NextPage } from "next";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import { useMounted } from "../hooks/useMounted";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabase/constants";
import Dashboard from "../pageComponents/dashboard";
import { DiscoverGuestView } from "../pageComponents/discover/DiscoverGuestView";
import { type SingleListData } from "../types/apiTypes";
import {
	DISCOVER_URL,
	FETCH_BOOKMARKS_DISCOVERABLE_API,
	getBaseUrl,
	NEXT_API_URL,
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
			<Spinner className="flex h-3 w-3 animate-spin items-center justify-center" />
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
			const response = await fetch(
				`${getBaseUrl()}${NEXT_API_URL}${FETCH_BOOKMARKS_DISCOVERABLE_API}?page=0`,
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as { data: SingleListData[] | null };

			return {
				props: {
					isDiscover: true,
					isAuthenticated: false,
					discoverData: data.data ?? [],
				},
			};
		} catch {
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
