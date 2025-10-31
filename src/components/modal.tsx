import { Dialog, useDialogState } from "ariakit/dialog";
import classNames from "classnames";
import { isEmpty } from "lodash";

import { type ChildrenTypes } from "../types/componentTypes";

type ModalProps = {
	children: ChildrenTypes;
	open: boolean;
	setOpen: () => void;
	// onClose: () => void;
	style?: React.CSSProperties;
	wrapperClassName?: string;
};

const Modal = (props: ModalProps) => {
	const {
		open,
		setOpen,
		children,
		wrapperClassName = "",
		// onClose,
		style,
	} = props;

	const dialog = useDialogState({
		open,
		setOpen,
	});

	const modalClassName = classNames({
		"bg-plain-color": true,
		[wrapperClassName]: true,
		"p-4 rounded-lg": isEmpty(wrapperClassName),
	});

	return (
		<Dialog
			className={modalClassName}
			id="modal-parent"
			state={dialog}
			style={style}
		>
			{children}
		</Dialog>
	);
};

export default Modal;
