import { type GetServerSideProps, type NextPage } from "next";
import { createServerClient, serializeCookieHeader } from "@supabase/ssr";
import axios from "axios";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabase/constants";
import Dashboard from "../pageComponents/dashboard";
import DiscoverGuestView from "../pageComponents/discover/DiscoverGuestView";
import { type SingleListData } from "../types/apiTypes";
import {
	DISCOVER_URL,
	FETCH_DISCOVER_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../utils/constants";

type CategoryPageProps = {
	isDiscover?: boolean;
	isAuthenticated?: boolean;
	discoverData?: SingleListData[];
};

const Home: NextPage<CategoryPageProps> = ({
	isDiscover = false,
	isAuthenticated = true,
	discoverData = [],
}) => {
	if (isDiscover && !isAuthenticated) {
		return <DiscoverGuestView discoverData={discoverData} />;
	}

	return <Dashboard />;
};

export const getServerSideProps: GetServerSideProps<CategoryPageProps> = async (
	context,
) => {
	const categoryId = context.params?.category_id as string;
	const isDiscover = categoryId === DISCOVER_URL;

	if (!isDiscover) {
		return { props: {} };
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
					for (const { name, value, options } of cookiesToSet) {
						context.res.setHeader(
							"Set-Cookie",
							serializeCookieHeader(name, value, options),
						);
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
			const response = await axios.get<{ data: SingleListData[] | null }>(
				`${getBaseUrl()}${NEXT_API_URL}${FETCH_DISCOVER_BOOKMARKS_API}?page=0`,
			);

			return {
				props: {
					isDiscover: true,
					isAuthenticated: false,
					discoverData: response.data.data ?? [],
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
		},
	};
};

export default Home;
