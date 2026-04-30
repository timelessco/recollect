import type { GetServerSideProps, NextPage } from "next";

import { createServerClient, serializeCookieHeader } from "@supabase/ssr";

import type { SingleListData } from "../../types/apiTypes";

import { logger } from "@/lib/api-helpers/axiom-logger";
import { extractErrorFields } from "@/lib/api-helpers/errors";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../lib/supabase/constants";
import { DiscoverGuestView } from "../../pageComponents/discover/DiscoverGuestView";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../utils/constants";

interface PublicDiscoverProps {
  discoverData: SingleListData[];
}

const PublicDiscover: NextPage<PublicDiscoverProps> = ({ discoverData }) => (
  <DiscoverGuestView discoverData={discoverData} />
);

export const getServerSideProps: GetServerSideProps<PublicDiscoverProps> = async (context) => {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return context.req.cookies
          ? Object.entries(context.req.cookies).map(([name, value]) => ({
              name,
              value: value ?? "",
            }))
          : [];
      },
      setAll(cookiesToSet) {
        if (context.res) {
          try {
            for (const { name, options, value } of cookiesToSet) {
              context.res.appendHeader("Set-Cookie", serializeCookieHeader(name, value, options));
            }
          } catch {
            // Cookie setting may fail in certain Server Component contexts
            // Silently fail to prevent SSR errors
          }
        }
      },
    },
  });

  try {
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
				trash,
				type,
				meta_data,
				sort_index,
				make_discoverable,
				user_id
`,
      )
      .is("trash", null)
      .not("make_discoverable", "is", null)
      .order("make_discoverable", { ascending: true })
      .range(rangeStart, rangeEnd);

    if (error) {
      console.error("[public-discover-ssr] Failed to fetch discoverable bookmarks:", error);
      logger.error("fetch_discoverable_bookmarks_failed", {
        operation: "fetch_discoverable_bookmarks",
        route: "public-discover-ssr",
        ...extractErrorFields(error),
      });
      await logger.flush();
      return {
        props: {
          discoverData: [],
        },
      };
    }

    // oxlint-disable-next-line no-unsafe-type-assertion -- Supabase partial select doesn't match full SingleListData shape
    const discoverData = (data?.map((item) => ({
      ...item,
      addedCategories: [],
      addedTags: [],
    })) ?? []) as unknown as SingleListData[];

    return {
      props: {
        discoverData,
      },
    };
  } catch (error) {
    console.error("[public-discover-ssr] Error fetching discoverable bookmarks:", error);
    logger.error("public_discover_ssr_failed", {
      operation: "fetch_discoverable_bookmarks",
      route: "public-discover-ssr",
      ...extractErrorFields(error),
    });
    await logger.flush();
    return {
      props: {
        discoverData: [],
      },
    };
  }
};

export default PublicDiscover;
