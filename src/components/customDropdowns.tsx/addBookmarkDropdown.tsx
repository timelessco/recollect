import { useCallback, useEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import isEmpty from "lodash/isEmpty";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";
import { useForm, type SubmitHandler } from "react-hook-form";

import Input from "../atoms/input";

import { useAddBookmark } from "@/hooks/useAddBookmark";
import { useFileUploadDrop } from "@/hooks/useFileUploadDrop";
import { AddBookmarkInputIcon } from "@/icons/miscellaneousIcons/add-bookmark-input-icon";
import PlusIconWhite from "@/icons/plusIconWhite";
import { type FileType } from "@/types/componentTypes";
import {
	dropdownMenuClassName,
	grayInputClassName,
} from "@/utils/commonClassNames";
import { URL_PATTERN } from "@/utils/constants";

const AddBookmarkDropdown = () => {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const down = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setOpen(true);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger
				className="flex items-center rounded-full bg-gray-950 p-[7px] text-white outline-hidden filter-[drop-shadow(0_3px_6px_rgba(0,0,0,0.07))_drop-shadow(0_11px_11px_rgba(0,0,0,0.06))] hover:bg-gray-800"
				title="create"
			>
				<figure className="h-4 w-4 text-gray-0">
					<PlusIconWhite />
				</figure>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" className="z-10" sideOffset={1}>
					<Popover.Popup className="origin-(--transform-origin) leading-[20px] outline-hidden">
						<AddBookmarkPopupContent onClose={() => setOpen(false)} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};

interface AddBookmarkPopupContentProps {
	onClose: () => void;
}

const AddBookmarkPopupContent = ({ onClose }: AddBookmarkPopupContentProps) => {
	const { onAddBookmark } = useAddBookmark();
	const { onDrop } = useFileUploadDrop();

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		clearErrors,
	} = useForm<{ url: string }>();

	const onSubmit: SubmitHandler<{ url: string }> = useCallback(
		(data) => {
			onAddBookmark(data.url);
			reset({ url: "" });
			onClose();
		},
		[onAddBookmark, onClose, reset],
	);

	const inputRef = useRef<HTMLInputElement>(null);
	const fileUploadInputRef = useRef<HTMLInputElement>(null);

	const { ref, ...rest } = register("url", {
		required: true,
		pattern: URL_PATTERN,
		onChange: () => {
			if (!isEmpty(errors)) {
				clearErrors();
			}
		},
	});

	return (
		<div className={`relative w-[326px] ${dropdownMenuClassName}`}>
			<input
				className="hidden"
				onChange={(event) =>
					!isNil(event.target.files) &&
					onDrop(event.target.files as unknown as FileType[])
				}
				ref={fileUploadInputRef}
				type="file"
			/>
			<button
				className="flex items-center p-0 text-gray-600 hover:text-gray-900"
				onClick={() => {
					if (fileUploadInputRef.current) {
						fileUploadInputRef.current.click();
					}
				}}
				type="button"
			>
				<AddBookmarkInputIcon className="absolute top-[11px] left-[14px] z-1 h-4 w-4" />
			</button>
			<form onSubmit={handleSubmit(onSubmit)}>
				<Input
					autoFocus
					className={`rounded-[11px] pl-[32px] ${grayInputClassName}`}
					errorClassName="ml-2"
					{...rest}
					errorText="Enter valid URL"
					isError={!isEmpty(errors)}
					placeholder="Add a link or drop a file anywhere"
					ref={(event) => {
						ref(event);
						if (!isNull(inputRef)) {
							inputRef.current = event;
						}
					}}
				/>
			</form>
		</div>
	);
};

export default AddBookmarkDropdown;
