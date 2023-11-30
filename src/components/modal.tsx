import { Dialog, useDialogState } from "ariakit/dialog";
import classNames from "classnames";
import { isEmpty } from "lodash";

import { type ChildrenTypes } from "../types/componentTypes";

type ModalProps = {
	children: ChildrenTypes;
	open: boolean;
	setOpen: () => void;
	wrapperClassName?: string;
	// onClose: () => void;
};

const Modal = (props: ModalProps) => {
	const {
		open,
		setOpen,
		children,
		wrapperClassName = "",
		// onClose,
	} = props;

	const dialog = useDialogState({
		open,
		setOpen,
	});

	const modalClassName = classNames({
		"bg-white mt-[5%]": true,
		[wrapperClassName]: true,
		"p-4 rounded-lg": isEmpty(wrapperClassName),
	});

	return (
		<Dialog className={modalClassName} id="modal-parent" state={dialog}>
			{children}
		</Dialog>
	);
};

export default Modal;
