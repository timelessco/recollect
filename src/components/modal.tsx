/* This example requires Tailwind CSS v2.0+ */
import { Fragment } from 'react';
import { ChildrenTypes } from '../types/componentTypes';
import { Dialog, useDialogState } from 'ariakit/dialog';

interface ModalProps {
  open: boolean;
  setOpen: () => void;
  children: ChildrenTypes;
}

export default function Modal(props: ModalProps) {
  const { open, setOpen, children } = props;

  const dialog = useDialogState({
    open: open,
    setOpen,
  });

  return (
    <>
      <Dialog state={dialog} className="dialog">
        {children}
      </Dialog>
    </>
  );
}
