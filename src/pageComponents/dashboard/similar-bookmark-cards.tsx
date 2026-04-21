import dynamic from "next/dynamic";
import { useRouter } from "next/router";

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

const renderErrorState = () => (
  <div className="flex w-full items-center justify-center py-16 text-center">
    <p className="text-lg font-medium text-red-600">
      Could not load similar bookmarks. Please try again.
    </p>
  </div>
);

export const SimilarBookmarkCards = () => {
  const session = useSupabaseSession((state) => state.session);
  const router = useRouter();
  const rawId = typeof router.query.id === "string" ? router.query.id : "";
  const bookmarkId = /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
  const isValidId = Number.isFinite(bookmarkId) && bookmarkId > 0;

  const {
    data: similar,
    isError,
    isLoading,
  } = useFetchSimilarBookmarks(isValidId ? bookmarkId : undefined);

  if (!session) {
    return <SignedOutSection />;
  }

  const renderContent = () => {
    if (!isLoading && isError) {
      return renderErrorState();
    }

    if (!isLoading && (similar?.length ?? 0) === 0) {
      return renderEmptyState();
    }

    return <CardSection isLoading={isLoading} listData={similar ?? []} />;
  };

  return (
    <div
      className="flex h-screen flex-col overflow-x-hidden overflow-y-auto"
      id="scrollableDiv"
      style={{ overflowAnchor: "none" }}
    >
      {renderContent()}
    </div>
  );
};
