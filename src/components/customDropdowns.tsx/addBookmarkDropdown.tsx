import { useRef, type Ref } from "react";
import { isEmpty } from "lodash";
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
	const inputRef = useRef<HTMLInputElement>(null);

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

	return (
		<AriaDropdown
			// isOpen={showAddBookmarkShortcutModal}
			menuButton={
				<Button
					className="rounded-full p-[7px] hover:bg-black"
					// onClick={onNavAddClick}
					title="create"
					type="dark"
				>
					<figure className="h-4 w-4">
						<PlusIconWhite />
					</figure>
				</Button>
			}
			menuOpenToggle={(value) => {
				if (!value) {
					reset({ url: "" });
					clearErrors();
				}

				inputRef?.current?.focus();
			}}
		>
			<div className={`relative w-[326px] ${dropdownMenuClassName}`}>
				<AddBoomarkInputIcon className="absolute left-[14px] top-[13px] z-[1]" />
				<form onSubmit={handleSubmit(onSubmit)}>
					<Input
						autoFocus
						className={`rounded-[11px] pl-[32px] ${grayInputClassName}`}
						placeholder="Add a link or drop a file anywhere"
						{...register("url", {
							required: true,
							pattern: URL_PATTERN,
						})}
						errorClassName="ml-2"
						errorText="Enter valid URL"
						isError={!isEmpty(errors)}
						ref={inputRef}
					/>
				</form>
			</div>
		</AriaDropdown>
	);
};

export default AddBookmarkDropdown;
