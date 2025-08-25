import { type CardSectionProps } from ".";
import { useRef, type ReactNode } from "react";
import classNames from "classnames";
import omit from "lodash/omit";
import {
	mergeProps,
	useDraggableItem,
	useFocusRing,
	useOption,
	type DraggableItemProps,
} from "react-aria";
import { type DraggableCollectionState, type ListState } from "react-stately";

import Checkbox from "../../../components/checkbox";
import { type SingleListData } from "../../../types/apiTypes";
import {
	CATEGORY_ID_PATHNAME,
	PREVIEW_PATH,
	viewValues,
} from "../../../utils/constants";

import "yet-another-react-lightbox/styles.css";

import { useRouter } from "next/router";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { getCategorySlugFromRouter } from "../../../utils/url";

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
		"single-bookmark group relative flex  rounded-lg duration-150 outline-none",
		{
			"mb-6": cardTypeCondition === viewValues.moodboard,
			"mb-[18px]": cardTypeCondition === viewValues.card,
			// "hover:shadow-custom-4":
			// 	cardTypeCondition === viewValues.moodboard ||
			// 	cardTypeCondition === viewValues.card ||
			// 	cardTypeCondition === viewValues.timeline,
			"hover:shadow-lg":
				cardTypeCondition === viewValues.moodboard ||
				cardTypeCondition === viewValues.card ||
				cardTypeCondition === viewValues.timeline,
			"hover:bg-custom-gray-8 mb-1":
				(cardTypeCondition === viewValues.list ||
					cardTypeCondition === viewValues.headlines) &&
				!isSelected,

			"mb-1 list-headlines-wrapper":
				cardTypeCondition === viewValues.list ||
				cardTypeCondition === viewValues.headlines,
		},
	);

	const disableDndCondition = isPublicPage;

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
			{...(!lightboxOpen
				? mergeProps(
						disableDndCondition
							? []
							: omit(dragProps, ["onKeyDownCapture", "onKeyUpCapture"]),
						disableDndCondition ? [] : focusProps,
				  )
				: {})}
		>
			{/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
			<a
				className={`absolute left-0 top-0  h-full w-full rounded-lg ${
					isTrashPage ? "cursor-auto" : "cursor-pointer"
				}`}
				draggable={false}
				href={url}
				onClick={(event) => {
					if (isTrashPage || item?.key === "$.0") {
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
					classname={`${
						isSelected ? "opacity-100" : "opacity-0"
					} absolute cursor-pointer opacity-0 z-15 group-hover:opacity-100 top-[13px] right-[3px]  ${
						cardTypeCondition === viewValues.list
							? "top-[18px]"
							: cardTypeCondition === viewValues.headlines
							? "top-[14px]"
							: "top-3"
					}`}
					value={isSelected ? "true" : "false"}
					{...(optionProps.onPointerDown
						? { onPointerDown: optionProps.onPointerDown }
						: {})}
				/>
			)}
		</li>
	);
};

export default Option;
