import { useEffect } from "react";
import isEmpty from "lodash/isEmpty";
import { useForm, type SubmitHandler } from "react-hook-form";

import Input from "../../../components/atoms/input";
import Modal from "../../../components/modal";
import Spinner from "../../../components/spinner";
import { useModalStore } from "../../../store/componentStore";
import { URL_PATTERN } from "../../../utils/constants";

type AddBookarkShortcutModalProps = {
	isAddBookmarkLoading: boolean;
	onAddBookmark: (url: string) => void;
};

const AddBookarkShortcutModal = (props: AddBookarkShortcutModalProps) => {
	const { onAddBookmark, isAddBookmarkLoading } = props;
	const showAddBookmarkShortcutModal = useModalStore(
		(state) => state.showAddBookmarkShortcutModal,
	);

	const toggleShowAddBookmarkShortcutModal = useModalStore(
		(state) => state.toggleShowAddBookmarkShortcutModal,
	);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<{ url: string }>();
	const onSubmit: SubmitHandler<{ url: string }> = (data) => {
		onAddBookmark(data.url);
		reset({ url: "" });
	};

	// reset state on modal close
	useEffect(() => {
		if (!showAddBookmarkShortcutModal) {
			reset({ url: "" });
		}
	}, [reset, showAddBookmarkShortcutModal]);

	return (
		<Modal
			open={showAddBookmarkShortcutModal}
			setOpen={toggleShowAddBookmarkShortcutModal}
			wrapperClassName="p-4 w-[40%] rounded-lg"
		>
			{isAddBookmarkLoading ? (
				<div className="flex justify-center">
					<Spinner />
				</div>
			) : (
				<form onSubmit={handleSubmit(onSubmit)}>
					<Input
						{...register("url", {
							required: true,
							pattern: URL_PATTERN,
						})}
						className=" bg-custom-gray-8 px-2 py-1  outline-none focus:border-transparent"
						errorClassName="ml-2"
						errorText="Enter valid URL"
						id="add-url-input"
						isError={!isEmpty(errors)}
						placeholder="Add URL"
					/>
				</form>
			)}
		</Modal>
	);
};

export default AddBookarkShortcutModal;
