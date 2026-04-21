import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { useFetchBookmarkById } from "../../async/queryHooks/bookmarks/use-fetch-bookmark-by-id";
import useFetchSimilarBookmarks from "../../async/queryHooks/bookmarks/use-fetch-similar-bookmarks";
import { useSupabaseSession } from "../../store/componentStore";
import SignedOutSection from "./signedOutSection";

const CardSection = dynamic(() => import("./cardSection"), {
  ssr: false,
});

const renderEmptyState = () => (
  <div className="flex w-full items-center justify-center py-16 text-center">
    <p className="text-lg font-medium text-gray-600">
      No strong matches yet — your library may still be enriching, or this bookmark is one of a
      kind.
    </p>
  </div>
);

export const SimilarBookmarkCards = () => {
  const session = useSupabaseSession((state) => state.session);
  const router = useRouter();
  const rawId = typeof router.query.id === "string" ? router.query.id : "";
  const bookmarkId = Number.parseInt(rawId, 10);
  const isValidId = Number.isFinite(bookmarkId) && bookmarkId > 0;

  const { data: sourceRows } = useFetchBookmarkById(rawId, { enabled: isValidId });
  const source = sourceRows?.[0];

  const { data: similar, isLoading } = useFetchSimilarBookmarks(isValidId ? bookmarkId : undefined);

  if (!session) {
    return <SignedOutSection />;
  }

  const showEmptyState = !isLoading && (similar?.length ?? 0) === 0;

  return (
    <div
      className="flex h-screen flex-col overflow-x-hidden overflow-y-auto"
      id="scrollableDiv"
      style={{ overflowAnchor: "none" }}
    >
      <header className="px-6 pt-6 pb-4">
        <p className="mb-1 text-sm text-gray-500">Similar to</p>
        <h1 className="truncate text-xl font-semibold text-plain-reverse">
          {source?.title ?? (isValidId ? "Loading…" : "Unknown bookmark")}
        </h1>
      </header>

      {showEmptyState ? (
        renderEmptyState()
      ) : (
        <CardSection isLoading={isLoading} listData={similar ?? []} />
      )}
    </div>
  );
};
