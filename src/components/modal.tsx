import { Dialog, useDialogState } from "ariakit/dialog";

import type { ChildrenTypes } from "../types/componentTypes";

interface ModalProps {
  open: boolean;
  setOpen: () => void;
  children: ChildrenTypes;
  // onClose: () => void;
}

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
    <Dialog state={dialog} className="dialog" id="modal-parent">
      {children}
    </Dialog>
  );
};

export default Modal;
