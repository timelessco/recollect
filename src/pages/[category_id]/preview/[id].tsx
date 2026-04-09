import "yet-another-react-lightbox/styles.css";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { useFetchBookmarkById } from "../../../async/queryHooks/bookmarks/use-fetch-bookmark-by-id";
import { CustomLightBox } from "../../../components/lightbox/LightBox";
import { Spinner } from "../../../components/spinner";
import { EVERYTHING_URL } from "../../../utils/constants";

const Preview = () => {
  const router = useRouter();
  const id = String(router.query.id ?? "");
  const { data: bookmark, error, isLoading } = useFetchBookmarkById(id);

  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    void router.push(`/${EVERYTHING_URL}`);
  };

  // Handle redirects in useEffect to prevent SSR issues
  useEffect(() => {
    if (router.isReady && ((!isLoading && !bookmark?.[0]) || error)) {
      void router.push(`/${EVERYTHING_URL}`);
    }
  }, [router, isLoading, bookmark, error]);

  // Wait for router to be ready before rendering
  if (!router.isReady || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-3 w-3 animate-spin" style={{ color: "var(--color-plain-reverse)" }} />
      </div>
    );
  }

  if (!bookmark?.[0] || error) {
    return null;
  }

  const [bookmarkData] = bookmark;

  return (
    <CustomLightBox
      activeIndex={0}
      bookmarks={[bookmarkData]}
      handleClose={handleClose}
      isOpen={isOpen}
      setActiveIndex={() => {
        // intentional no-op: single bookmark preview has no navigation
      }}
    />
  );
};

export default Preview;
