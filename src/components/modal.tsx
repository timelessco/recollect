import { Dialog, useDialogState } from "ariakit/dialog";

import { type ChildrenTypes } from "../types/componentTypes";

type ModalProps = {
	children: ChildrenTypes;
	open: boolean;
	setOpen: () => void;
	// onClose: () => void;
};

const Modal = (props: ModalProps) => {
	const {
		open,
		setOpen,
		children,
		// onClose,
	} = props;

	const dialog = useDialogState({
		open,
		setOpen,
	});

	return (
		<Dialog className="dialog" id="modal-parent" state={dialog}>
			{children}
		</Dialog>
	);
};

export default Modal;
