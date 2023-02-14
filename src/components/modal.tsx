import { Dialog, useDialogState } from "ariakit/dialog";

import type { ChildrenTypes } from "../types/componentTypes";

import Button from "./atoms/button";

interface ModalProps {
  open: boolean;
  // setOpen: () => void;
  children: ChildrenTypes;
  onClose: () => void;
}

const Modal = (props: ModalProps) => {
  const {
    open,
    // setOpen,
    children,
    onClose,
  } = props;

  const dialog = useDialogState({
    open,
    // setOpen,
  });

  return (
    <Dialog state={dialog} className="dialog">
      {children}
      <Button onClick={onClose} type="dark">
        <p className="w-full py-1 text-center text-white">Close</p>
      </Button>
    </Dialog>
  );
};

export default Modal;
