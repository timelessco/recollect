import { type CardSectionProps } from ".";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

import Spinner from "../../../components/spinner";
import useIsMobileView from "../../../hooks/useIsMobileView";
import { type SingleListData } from "../../../types/apiTypes";
import { viewValues } from "../../../utils/constants";
import { clickToOpenInNewTabLogic } from "../../../utils/helpers";

import PreviewModal from "./previewModal";

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
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isIframeLoading, setIsIframeLoading] = useState(true);

	useEffect(() => {
		// Reset loading state when modal is opened
		setIsIframeLoading(true);
	}, [isModalOpen]);
	const { isDesktop } = useIsMobileView();
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

	const handleCardClick = (event: React.MouseEvent, cardUrl: string) => {
		event.preventDefault();
		event.stopPropagation();
		if (isPublicPage || isTrashPage) {
			clickToOpenInNewTabLogic(
				event,
				cardUrl,
				isPublicPage,
				isTrashPage,
				isDesktop,
			);
		} else {
			setIsModalOpen(true);
		}
	};

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
		<>
			<li
				{...mergeProps(
					// NOTE: we are omiting some keys in dragprops because they are causing focus trap issue
					// the main problem that caused the focus trap issue is onKeyUpCapture
					disableDndCondition
						? []
						: omit(dragProps, ["onKeyDownCapture", "onKeyUpCapture"]),
					disableDndCondition ? [] : focusProps,
					disableDndCondition ? [] : optionProps,
				)}
				className={liClassName}
				ref={ref}
			>
				{/* we are disabling as this a tag is only to tell card is a link , but its eventually not functional */}
				{/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
				<a
					className="absolute left-0 top-0 h-full w-full cursor-default rounded-lg"
					draggable={false}
					href={url}
					onClick={(event) => handleCardClick(event, url)}
				/>
				{item.rendered}
			</li>
			{!isPublicPage && !isTrashPage && (
				<PreviewModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					title="Preview"
				>
					<div className="flex h-[80vh] w-full flex-col">
						<div className="relative flex-1 overflow-auto">
							{isIframeLoading && (
								<div className="absolute inset-0 flex items-center justify-center bg-gray-50">
									<Spinner />
								</div>
							)}
							{/* eslint-disable-next-line react/iframe-missing-sandbox */}
							<iframe
								className={`h-full min-h-[500px] w-full ${
									isIframeLoading ? "opacity-0" : "opacity-100"
								}`}
								onError={() => setIsIframeLoading(false)}
								onLoad={() => setIsIframeLoading(false)}
								sandbox="allow-scripts allow-same-origin"
								src={url}
								title="Embedded Website"
							/>
						</div>
					</div>
				</PreviewModal>
			)}
		</>
	);
};

export default Option;
