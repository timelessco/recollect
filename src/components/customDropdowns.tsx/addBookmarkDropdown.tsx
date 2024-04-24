import { useEffect, useRef, useState } from "react";
import { isEmpty, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import AddBoomarkInputIcon from "../../icons/miscellaneousIcons/addBoomarkInputIcon";
import PlusIconWhite from "../../icons/plusIconWhite";
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
};

const AddBookmarkDropdown = ({ onAddBookmark }: AddBookmarkDropdownTypes) => {
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

	const { ref, ...rest } = register("url", {
		required: true,
		pattern: URL_PATTERN,
	});

	return (
		<AriaDropdown
			initialFocusRef={inputRef}
			isOpen={openDropdown}
			menuButton={
				<Button
					className="rounded-full p-[7px] hover:bg-black"
					title="create"
					type="dark"
				>
					<figure className="h-4 w-4">
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
				<AddBoomarkInputIcon className="absolute left-[14px] top-[13px] z-[1]" />
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
	);
};

export default AddBookmarkDropdown;
