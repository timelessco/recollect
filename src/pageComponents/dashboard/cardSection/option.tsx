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

import { type SingleListData } from "../../../types/apiTypes";
import { viewValues } from "../../../utils/constants";
import { clickToOpenInNewTabLogic } from "../../../utils/helpers";

import { ToggleableCheckbox } from "./ToggleableCheckbox";

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
	// Register the item as a drag source.
	const { dragProps } = useDraggableItem(
		{
			key: item.key,
		},
		dragState,
	);
	// Merge option props and dnd props, and render the item.

	const liClassName = classNames(
		"single-bookmark group relative flex cursor-pointer rounded-lg duration-150 outline-none",
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
				"bg-black text-white": isSelected,
			})}
			ref={ref}
			role="option"
			{...mergeProps(
				// NOTE: we are omiting some keys in dragprops because they are causing focus trap issue
				// the main problem that caused the focus trap issue is onKeyUpCapture
				disableDndCondition
					? []
					: omit(dragProps, ["onKeyDownCapture", "onKeyUpCapture"]),
				disableDndCondition ? [] : focusProps,
			)}
		>
			{/* we are disabling as this a tag is only to tell card is a link , but its eventually not functional */}
			{/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
			<a
				className="absolute left-0 top-0 h-full w-full cursor-default rounded-lg"
				draggable={false}
				href={url}
				onClick={(event) =>
					clickToOpenInNewTabLogic(event, url, isPublicPage, isTrashPage)
				}
			/>
			{item.rendered}
			<ToggleableCheckbox
				checked={isSelected}
				className={`${
					isSelected ? "opacity-100" : "opacity-0"
				} absolute right-3.5 top-10 h-4 w-4 cursor-pointer opacity-0 group-hover:opacity-100 ${
					cardTypeCondition === viewValues.list
						? "right-28 top-5"
						: cardTypeCondition === viewValues.headlines
						? "right-28 top-4"
						: "top-10"
				}`}
				{...mergeProps(disableDndCondition ? [] : optionProps)}
			/>
		</li>
	);
};

export default Option;
