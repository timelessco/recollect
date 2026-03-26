import "yet-another-react-lightbox/styles.css";

import { useRouter } from "next/router";
import { useRef } from "react";
import type { ReactNode } from "react";
import { mergeProps, useDraggableItem, useFocusRing, useOption } from "react-aria";
import type { DraggableItemProps } from "react-aria";
import type { DraggableCollectionState, ListState } from "react-stately";

import { pick } from "lodash";
import omit from "lodash/omit";

import type { CardSectionProps } from ".";
import type { SingleListData } from "../../../types/apiTypes";

import { AnimatedBookmarkCard } from "@/components/ui/recollect/animated-bookmark-card";
import { Checkbox } from "@/components/ui/recollect/checkbox";
import { cn } from "@/utils/tailwind-merge";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { DISCOVER_URL, viewValues } from "../../../utils/constants";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../../utils/url";
import { buildAuthenticatedPreviewUrl, buildPublicPreviewUrl } from "../../../utils/url-builders";

type OptionDropItemTypes = DraggableItemProps & {
  rendered: ReactNode;
};

const Option = ({
  cardTypeCondition,
  dragState,
  isPublicPage,
  isTrashPage,
  item,
  state,
  url,
}: {
  cardTypeCondition: unknown;
  dragState: DraggableCollectionState;
  isPublicPage: CardSectionProps["isPublicPage"];
  isTrashPage: boolean;
  item: OptionDropItemTypes;
  state: ListState<unknown>;
  type: SingleListData["type"];
  url: string;
}) => {
  // Setup listbox option as normal. See useListBox docs for details.
  const ref = useRef(null);
  const { isSelected, optionProps } = useOption({ key: item.key }, state, ref);
  const { focusProps } = useFocusRing();
  const router = useRouter();
  const categorySlug = getCategorySlugFromRouter(router);
  const isDiscoverPage = categorySlug === DISCOVER_URL;
  const { lightboxOpen, setLightboxId, setLightboxOpen } = useMiscellaneousStore();
  // Register the item as a drag source.
  const { dragProps } = useDraggableItem(
    {
      key: item.key,
    },
    dragState,
  );
  // Merge option props and dnd props, and render the item.

  const liClassName = cn(
    "single-bookmark dark:group group relative flex rounded-lg outline-hidden duration-150",
    {
      "": cardTypeCondition === viewValues.card,
      // "hover:shadow-custom-4":
      // 	cardTypeCondition === viewValues.moodboard ||
      // 	cardTypeCondition === viewValues.card ||
      // 	cardTypeCondition === viewValues.timeline,
      "hover:shadow-lg":
        cardTypeCondition === viewValues.moodboard ||
        cardTypeCondition === viewValues.card ||
        cardTypeCondition === viewValues.timeline,
      "list-wrapper mb-1": cardTypeCondition === viewValues.list,

      "mb-1 hover:bg-gray-100": cardTypeCondition === viewValues.list && !isSelected,
    },
  );

  return (
    <li
      aria-selected={isSelected}
      className={cn(liClassName, {
        "rounded-t-3xl rounded-b-lg":
          isSelected &&
          (cardTypeCondition === viewValues.moodboard || cardTypeCondition === viewValues.card),
      })}
      ref={ref}
      role="option"
      {...omit(
        !lightboxOpen
          ? mergeProps(
              isPublicPage
                ? []
                : omit(dragProps, ["onKeyDown", "onKeyDownCapture", "onKeyUp", "onKeyUpCapture"]),
              isPublicPage ? [] : focusProps,
            )
          : {},
        ["values"],
      )}
    >
      {/* oxlint-disable-next-line jsx-a11y/anchor-has-content */}
      <a
        className={`absolute top-0 left-0 h-full w-full rounded-lg ${
          isTrashPage ? "cursor-auto" : "cursor-pointer"
        }`}
        draggable={false}
        href={url}
        onClick={(event) => {
          if (isTrashPage || item?.key?.toString().startsWith("$")) {
            event.preventDefault();
            return;
          }

          event.preventDefault();
          setLightboxId(item?.key?.toString());
          setLightboxOpen(true);
          if (isPublicPage && !isDiscoverPage) {
            const publicInfo = getPublicPageInfo(router);
            if (publicInfo) {
              const { as, pathname, query } = buildPublicPreviewUrl({
                bookmarkId: item?.key,
                publicInfo,
              });
              void router.push({ pathname, query }, as, { shallow: true });
            }
          } else {
            const currentCategorySlug = getCategorySlugFromRouter(router);
            if (currentCategorySlug) {
              const { as, pathname, query } = buildAuthenticatedPreviewUrl({
                bookmarkId: item?.key,
                categorySlug: currentCategorySlug,
              });
              void router.push({ pathname, query }, as, { shallow: true });
            }
          }
        }}
      />
      <AnimatedBookmarkCard id={Number(item.key)}>{item.rendered}</AnimatedBookmarkCard>

      {!isPublicPage && (
        <Checkbox
          checked={isSelected}
          className={cn(
            "absolute top-2.5 right-1.5 z-15 box-border flex size-[26px] cursor-pointer items-center justify-center rounded-lg text-sm backdrop-blur-[10px] group-hover:opacity-100 data-checked:bg-blacks-700 data-checked:text-whites-800 data-unchecked:bg-whites-700 data-unchecked:text-blacks-800",
            isSelected ? "opacity-100" : "opacity-0",
            cardTypeCondition === viewValues.list && "top-[15px]",
          )}
          // Pick only whats needed checkbox selection as the rest will cause an issue with drag and drop
          {...pick(optionProps, ["onClick", "onPointerDown"])}
        />
      )}
    </li>
  );
};

export default Option;
