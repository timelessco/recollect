import { useEffect, useRef, useState } from "react";

import { format } from "date-fns";
import { motion } from "motion/react";

import type { SingleListData } from "../../types/apiTypes";

import { usePageContext } from "@/hooks/use-page-context";
import useIsUserInTweetsPage from "@/hooks/useIsUserInTweetsPage";
import { GeminiAiIcon } from "@/icons/geminiAiIcon";
import { vercelEnvironment } from "@/site-config";
import { useMiscellaneousStore } from "@/store/componentStore";
import { getBookmarkColors } from "@/utils/colorUtils";

import { Icon } from "../atoms/icon";
import { GetBookmarkIcon } from "../get-bookmark-icon";
import { CategoryMultiSelect } from "./category-multi-select";
import { ColorPalette } from "./color-palette";
import {
  getKeywordsDisplay,
  hasKeywords,
  highlightSearch,
  searchMatchesText,
} from "./LightboxUtils";

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "";
  }
};

export interface SidepaneContentProps {
  currentBookmark: SingleListData;
  currentIndex: number;
  shouldFetch: boolean;
}

export function SidepaneContent({
  currentBookmark,
  currentIndex,
  shouldFetch,
}: SidepaneContentProps) {
  const [showMore, setShowMore] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAIOverflowContent, setHasAIOverflowContent] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const aiSummaryScrollRef = useRef<HTMLDivElement>(null);
  const expandableRef = useRef<HTMLDivElement>(null);

  const isUserInTweetsPage = useIsUserInTweetsPage();
  const { isDiscoverPage, isPublicPage } = usePageContext();

  const searchText = useMiscellaneousStore((state) => state.searchText);
  const trimmedSearchText = searchText?.trim() ?? "";

  const lightboxShowSidepane = useMiscellaneousStore((state) => state.lightboxShowSidepane);

  const metaData = currentBookmark?.meta_data;
  const showKeywords = hasKeywords(metaData?.image_keywords) && vercelEnvironment !== "production";
  const collapsedOffset = (currentBookmark?.addedTags?.length ?? 0) > 0 ? 145 : 110;

  useEffect(() => {
    setShowMore(false);
    setIsExpanded(false);

    const timeoutId = setTimeout(() => {
      if (expandableRef?.current) {
        setHasAIOverflowContent(expandableRef.current.scrollHeight > 120);
      }

      if (descriptionRef?.current) {
        const element = descriptionRef.current;
        setIsOverflowing(element.scrollHeight > element.clientHeight);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    currentBookmark?.id,
    currentBookmark?.description,
    currentBookmark?.addedTags,
    currentBookmark?.meta_data,
    currentIndex,
    lightboxShowSidepane,
  ]);

  let domain: string | undefined;
  try {
    domain = new URL(currentBookmark.url).hostname;
  } catch {
    domain = undefined;
  }

  return (
    <>
      <div className="flex flex-1 flex-col p-5 text-left">
        {currentBookmark?.title && (
          <div>
            <p
              className="pb-2 align-middle text-[14px] leading-[115%] font-medium tracking-[0.01em] text-gray-900"
              tabIndex={-1}
            >
              {highlightSearch(currentBookmark.title, trimmedSearchText)}
            </p>
          </div>
        )}
        {domain && (
          <div
            className="pb-4 align-middle text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600"
            tabIndex={-1}
          >
            <div className="flex items-center gap-1 text-13 leading-[138%]">
              <div className="flex h-[15px] w-[15px] items-center text-gray-600">
                {currentBookmark ? (
                  <GetBookmarkIcon
                    isUserInTweetsPage={isUserInTweetsPage}
                    item={currentBookmark}
                    size={15}
                  />
                ) : null}
              </div>
              <span className="truncate">{highlightSearch(domain ?? "", trimmedSearchText)}</span>
              <span>·</span>
              {currentBookmark?.inserted_at && (
                <span className="truncate">{formatDate(currentBookmark.inserted_at)}</span>
              )}
            </div>
          </div>
        )}
        {currentBookmark?.description && (
          <div className="relative">
            <p
              className={`${
                showMore ? "" : "line-clamp-4"
              } text-13 leading-[138%] font-normal tracking-[0.01em] text-clip text-gray-700`}
              ref={descriptionRef}
              tabIndex={-1}
            >
              {highlightSearch(currentBookmark.description, trimmedSearchText)}
              {showMore && isOverflowing && (
                <button
                  className="ml-1 inline text-13 leading-[138%] tracking-[0.01em] text-gray-700"
                  onClick={() => {
                    setShowMore(false);
                  }}
                  type="button"
                >
                  Show less
                </button>
              )}
            </p>
            {isOverflowing && !showMore && (
              <button
                className="absolute right-0 bottom-0 inline bg-gray-0 pl-1 text-13 leading-[138%] tracking-[0.01em] text-gray-700"
                onClick={() => {
                  setShowMore(true);
                }}
                type="button"
              >
                Show more
              </button>
            )}
          </div>
        )}
        {getBookmarkColors(metaData?.image_keywords).length > 0 && (
          <div className="pt-3 pb-1">
            <p className="pb-1.5 text-xs font-medium text-gray-500">Colors</p>
            <ColorPalette colors={getBookmarkColors(metaData?.image_keywords)} />
          </div>
        )}
        {!isDiscoverPage && !isPublicPage && (
          <CategoryMultiSelect bookmarkId={currentBookmark.id} shouldFetch={shouldFetch} />
        )}
      </div>
      {/* oxlint-disable prefer-nullish-coalescing -- boolean condition: empty string should be falsy */}
      {(currentBookmark?.addedTags?.length > 0 ||
        metaData?.img_caption ||
        metaData?.ocr ||
        metaData?.image_caption ||
        showKeywords) && (
        <motion.div
          animate={{
            y: isExpanded ? 0 : `max(0px, calc(100% - ${collapsedOffset}px))`,
          }}
          className="relative overflow-hidden"
          initial={{
            y: `max(0px, calc(100% - ${collapsedOffset}px))`,
          }}
          key={currentBookmark?.id}
          ref={expandableRef}
          transition={{
            damping: 25,
            stiffness: 300,
            type: "spring",
          }}
        >
          {currentBookmark?.addedTags?.length > 0 && (
            <div className="px-5 pb-[19px]">
              <div className="flex flex-wrap gap-[6px]">
                {currentBookmark.addedTags.map((tag: { id: number; name: string }) => (
                  <span
                    className="align-middle text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600"
                    key={tag?.id}
                  >
                    {highlightSearch(`#${tag.name}`, trimmedSearchText)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(metaData?.img_caption || metaData?.ocr || metaData?.image_caption || showKeywords) && (
            <motion.div
              className={`relative px-5 py-3 text-sm ${
                hasAIOverflowContent ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (!hasAIOverflowContent) {
                  return;
                }

                setIsExpanded((prev) => !prev);
                if (aiSummaryScrollRef.current) {
                  aiSummaryScrollRef.current.scrollTop = 0;
                }
              }}
              onPointerDownCapture={(event) => {
                if (hasAIOverflowContent) {
                  event.stopPropagation();
                }
              }}
              whileTap={hasAIOverflowContent ? { scale: 0.98 } : {}}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-[15px] w-[15px] text-gray-600">
                  <GeminiAiIcon />
                </Icon>
                <p className="align-middle text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600">
                  AI Summary
                </p>
              </div>
              <div
                className={`max-h-[200px] ${isExpanded ? "hide-scrollbar scroll-shadows" : ""}`}
                ref={aiSummaryScrollRef}
              >
                <p className="text-13 leading-[138%] tracking-[0.01em] text-gray-500">
                  {highlightSearch(
                    metaData?.img_caption ?? metaData?.image_caption ?? "",
                    trimmedSearchText,
                  )}
                  {metaData?.ocr && searchMatchesText(metaData.ocr, trimmedSearchText) && (
                    <>
                      {(metaData?.img_caption ?? metaData?.image_caption) && (
                        <>
                          <br />
                          <br />
                        </>
                      )}
                      {highlightSearch(metaData.ocr, trimmedSearchText)}
                    </>
                  )}
                  {showKeywords &&
                    searchMatchesText(
                      getKeywordsDisplay(metaData?.image_keywords),
                      trimmedSearchText,
                    ) && (
                      <>
                        {(metaData?.img_caption ?? metaData?.image_caption ?? metaData?.ocr) && (
                          <br />
                        )}
                        <span className="font-450">Keywords: </span>
                        {highlightSearch(
                          getKeywordsDisplay(metaData?.image_keywords),
                          trimmedSearchText,
                        )}
                      </>
                    )}
                </p>
                {showKeywords && (
                  <pre className="mt-2 max-h-[150px] overflow-auto rounded bg-gray-100 p-2 text-[11px] leading-tight text-gray-600">
                    {JSON.stringify(metaData?.image_keywords, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
      {!isExpanded && hasAIOverflowContent && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[60px]"
          style={{
            background:
              "linear-gradient(180deg, var(--color-whites-50) 0%, var(--color-whites-800) 77%, var(--color-whites-1000) 100%)",
          }}
        />
      )}
    </>
  );
}
