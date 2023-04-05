import isEmpty from "lodash/isEmpty";
import { useForm, type SubmitHandler } from "react-hook-form";

import Input from "../../../components/atoms/input";
import LabelledComponent from "../../../components/labelledComponent";
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

	return (
		<Modal
			open={showAddBookmarkShortcutModal}
			setOpen={toggleShowAddBookmarkShortcutModal}
		>
			{isAddBookmarkLoading ? (
				<div className="flex justify-center">
					<Spinner />
				</div>
			) : (
				<LabelledComponent label="Add URL">
					{/* disabling as handleSubmit is part of react hook form  */}
					<form onSubmit={handleSubmit(onSubmit)}>
						<Input
							{...register("url", {
								required: true,
								pattern: URL_PATTERN,
							})}
							className=" bg-custom-gray-8 px-2 py-1  outline-none focus:border-transparent"
							errorText="Enter valid URL"
							id="add-url-input"
							isError={!isEmpty(errors)}
							placeholder="Add URL"
						/>
					</form>
				</LabelledComponent>
			)}
		</Modal>
	);
};

export default AddBookarkShortcutModal;
