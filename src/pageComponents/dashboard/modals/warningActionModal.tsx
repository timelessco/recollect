import React from "react";

import Button from "../../../components/atoms/button";
import Modal from "../../../components/modal";
import Spinner from "../../../components/spinner";

interface WarningActionModalTypes {
  warningText: string;
  buttonText: string;
  onContinueCick: () => void;
  isLoading?: boolean;
  open: boolean;
  setOpen: () => void;
}

const WarningActionModal = (props: WarningActionModalTypes) => {
  const {
    warningText,
    buttonText,
    onContinueCick,
    isLoading = false,
    open,
    setOpen,
  } = props;

  return (
    <Modal open={open} onClose={setOpen}>
      {!isLoading ? (
        <>
          <p className="pb-7">{warningText}</p>
          <Button
            className="flex w-full justify-center bg-red-700 py-3 text-center text-white hover:bg-red-900"
            type="dark"
            onClick={() => onContinueCick()}
            id="warning-button"
          >
            {buttonText}
          </Button>
        </>
      ) : (
        <div className="flex justify-center">
          <Spinner />
        </div>
      )}
    </Modal>
  );
};

export default WarningActionModal;
