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
	const [isIframeLoading, setIsIframeLoading] = useState(true);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const { isDesktop } = useIsMobileView();

	useEffect(() => {
		// Reset loading state when modal is opened
		setIsIframeLoading(true);
	}, [isPreviewOpen]);

	// Setup listbox option as normal. See useListBox docs for details.
	const ref = useRef<HTMLLIElement>(null);
	const { optionProps, isSelected } = useOption({ key: item.key }, state, ref);
	const { focusProps } = useFocusRing();

	// Register the item as a drag source.
	const { dragProps } = useDraggableItem(
		{
			key: item.key,
		},
		dragState,
	);

	/**
	 * Determines the content type based on URL extension
	 * @returns The content type for the PreviewModal
	 */
	const getContentType = (): "file" | "image" | "url" => {
		const urlLower = url.toLowerCase();

		// Check for image extensions
		const imageExtensions = [
			".png",
			".jpg",
			".jpeg",
			".gif",
			".webp",
			".svg",
			".bmp",
		];

		if (imageExtensions.some((extension) => urlLower.endsWith(extension))) {
			return "image";
		}

		// Check for document extensions
		const documentExtensions = [
			".pdf",
			".doc",
			".docx",
			".xls",
			".xlsx",
			".ppt",
			".pptx",
			".txt",
		];

		if (documentExtensions.some((extension) => urlLower.endsWith(extension))) {
			return "file";
		}

		// Check for video extensions
		const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];

		// Videos will be handled in the iframe
		if (videoExtensions.some((extension) => urlLower.endsWith(extension))) {
			return "url";
		}

		// Default to 'url' for everything else
		return "url";
	};

	const contentType = getContentType();

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
		} else if (!isPublicPage && !isTrashPage) {
			setIsPreviewOpen(true);
		}
	};

	const liClassName = classNames(
		"single-bookmark group relative flex cursor-pointer rounded-lg duration-150 outline-none",
		{
			"mb-6": cardTypeCondition === viewValues.moodboard,
			"mb-[18px]": cardTypeCondition === viewValues.card,
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
					contentType={contentType}
					isOpen={isPreviewOpen}
					onOpenChange={setIsPreviewOpen}
				>
					{isIframeLoading && (
						<div className="absolute inset-0 flex items-center justify-center">
							<Spinner />
						</div>
					)}
					{/* eslint-disable-next-line react/iframe-missing-sandbox */}
					<iframe
						className={`h-full w-full flex-1  ${
							contentType === "url" ? "rounded-t-3xl" : ""
						} ${isIframeLoading ? "opacity-0" : "opacity-100"}`}
						onError={() => setIsIframeLoading(false)}
						onLoad={() => setIsIframeLoading(false)}
						src={url}
						title="Embedded Website"
					/>
				</PreviewModal>
			)}
		</>
	);
};

export default Option;
