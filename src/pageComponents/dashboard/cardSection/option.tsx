import "yet-another-react-lightbox/styles.css";

import { type CardSectionProps } from ".";
import { useRef, type ReactNode } from "react";
import { useRouter } from "next/router";
import classNames from "classnames";
import { pick } from "lodash";
import omit from "lodash/omit";
import {
	mergeProps,
	useDraggableItem,
	useFocusRing,
	useOption,
	type DraggableItemProps,
} from "react-aria";
import { type DraggableCollectionState, type ListState } from "react-stately";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";
import {
	CATEGORY_ID_PATHNAME,
	DISCOVER_URL,
	PREVIEW_PATH,
	viewValues,
} from "../../../utils/constants";
import { getCategorySlugFromRouter } from "../../../utils/url";

import { Checkbox } from "@/components/ui/recollect/checkbox";
import { cn } from "@/utils/tailwind-merge";

type OptionDropItemTypes = DraggableItemProps & {
	rendered: ReactNode;
};

const Option = ({
	item,
	state,
	dragState,
	cardTypeCondition,
	url,
	isPublicPage,
	isTrashPage,
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
	const { optionProps, isSelected } = useOption({ key: item.key }, state, ref);
	const { focusProps } = useFocusRing();
	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);
	const isDiscoverPage = categorySlug === DISCOVER_URL;
	const { setLightboxId, setLightboxOpen, lightboxOpen } =
		useMiscellaneousStore();
	// Register the item as a drag source.
	const { dragProps } = useDraggableItem(
		{
			key: item.key,
		},
		dragState,
	);
	// Merge option props and dnd props, and render the item.

	const liClassName = classNames(
		"single-bookmark dark:group relative flex group rounded-lg duration-150 outline-hidden",
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
			"hover:bg-gray-100 mb-1":
				cardTypeCondition === viewValues.list && !isSelected,

			"mb-1 list-wrapper": cardTypeCondition === viewValues.list,
		},
	);

	return (
		<li
			aria-selected={isSelected}
			className={classNames(liClassName, {
				"rounded-t-3xl rounded-b-lg":
					isSelected &&
					(cardTypeCondition === viewValues.moodboard ||
						cardTypeCondition === viewValues.card),
			})}
			ref={ref}
			role="option"
			{...omit(
				!lightboxOpen
					? mergeProps(
							isPublicPage
								? []
								: omit(dragProps, ["onKeyDownCapture", "onKeyUpCapture"]),
							isPublicPage ? [] : focusProps,
						)
					: {},
				["values"],
			)}
		>
			{/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
			<a
				className={`absolute top-0 left-0 h-full w-full rounded-lg ${
					isTrashPage || (isPublicPage && !isDiscoverPage)
						? "cursor-auto"
						: "cursor-pointer"
				}`}
				draggable={false}
				href={url}
				onClick={(event) => {
					if (
						isTrashPage ||
						item?.key?.toString().startsWith("$") ||
						(isPublicPage && !isDiscoverPage)
					) {
						event.preventDefault();
						return;
					}

					event.preventDefault();
					setLightboxId(item?.key?.toString());
					setLightboxOpen(true);
					void router.push(
						{
							// https://github.com/vercel/next.js/discussions/11625
							// https://github.com/adamwathan/headbangstagram/pull/1/files
							pathname: `${CATEGORY_ID_PATHNAME}`,
							query: {
								category_id: getCategorySlugFromRouter(router),
								id: item?.key,
							},
						},
						`/${getCategorySlugFromRouter(router)}${PREVIEW_PATH}/${item?.key}`,
						{
							shallow: true,
						},
					);
				}}
			/>
			{item.rendered}

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
