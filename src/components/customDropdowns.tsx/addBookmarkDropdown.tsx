import { useEffect, useRef, useState } from "react";
import { isEmpty, isNil, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import AddBoomarkInputIcon from "../../icons/miscellaneousIcons/addBoomarkInputIcon";
import PlusIconWhite from "../../icons/plusIconWhite";
import { type FileType } from "../../types/componentTypes";
import {
	dropdownMenuClassName,
	grayInputClassName,
} from "../../utils/commonClassNames";
import { URL_PATTERN } from "../../utils/constants";
import { AriaDropdown } from "../ariaDropdown";
import Button from "../atoms/button";
import Input from "../atoms/input";

export type AddBookmarkDropdownTypes = {
	onAddBookmark: (url: string) => void;
	uploadFile: (file: FileType[]) => void;
};

const AddBookmarkDropdown = ({
	onAddBookmark,
	uploadFile,
}: AddBookmarkDropdownTypes) => {
	const [openDropdown, setOpenDropdown] = useState(false);

	useEffect(() => {
		const down = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setOpenDropdown(true);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		clearErrors,
	} = useForm<{ url: string }>();
	const onSubmit: SubmitHandler<{ url: string }> = (data) => {
		onAddBookmark(data.url);
		reset({ url: "" });
	};

	const inputRef = useRef<HTMLInputElement>(null);
	const fileUploadInputRef = useRef<HTMLInputElement>(null);

	const { ref, ...rest } = register("url", {
		required: true,
		pattern: URL_PATTERN,
	});

	return (
		<>
			<input
				className="hidden"
				onChange={(event) =>
					!isNil(event.target.files) &&
					uploadFile(event.target.files as unknown as FileType[])
				}
				ref={fileUploadInputRef}
				type="file"
			/>
			<AriaDropdown
				initialFocusRef={inputRef}
				isOpen={openDropdown}
				menuButton={
					<Button
						className="rounded-full p-[7px] [filter:drop-shadow(0_3px_6px_rgba(0,0,0,0.07))_drop-shadow(0_11px_11px_rgba(0,0,0,0.06))]"
						title="create"
						type="dark"
					>
						<figure className="h-4 w-4 text-gray-0">
							<PlusIconWhite />
						</figure>
					</Button>
				}
				menuOpenToggle={(value) => {
					setOpenDropdown(value);
					if (value === false) {
						reset({ url: "" });
						clearErrors();
					}
				}}
			>
				<div className={`relative w-[326px] ${dropdownMenuClassName}`}>
					<Button
						className="p-0 text-gray-600 hover:text-gray-900"
						onClick={() => {
							if (fileUploadInputRef.current) {
								fileUploadInputRef.current.click();
							}
						}}
					>
						<AddBoomarkInputIcon className="absolute left-[14px] top-[11px] z-[1]" />
					</Button>
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
									// eslint-disable-next-line @typescript-eslint/ban-ts-comment
									// @ts-expect-error
									inputRef.current = event;
								}
							}}
						/>
					</form>
				</div>
			</AriaDropdown>
		</>
	);
};

export default AddBookmarkDropdown;
