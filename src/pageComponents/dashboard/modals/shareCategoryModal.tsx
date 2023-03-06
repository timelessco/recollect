import { useEffect } from "react";

import Modal from "../../../components/modal";
import {
  useMiscellaneousStore,
  useModalStore,
} from "../../../store/componentStore";
import ShareContent from "../share/shareContent";

const ShareCategoryModal = () => {
  const showShareCategoryModal = useModalStore(
    state => state.showShareCategoryModal,
  );
  const setShareCategoryId = useMiscellaneousStore(
    state => state.setShareCategoryId,
  );

  const toggleShareCategoryModal = useModalStore(
    state => state.toggleShareCategoryModal,
  );

  useEffect(() => {
    if (showShareCategoryModal === false) {
      setShareCategoryId(undefined);
    }
  }, [setShareCategoryId, showShareCategoryModal]);

  return (
    <Modal open={showShareCategoryModal} setOpen={toggleShareCategoryModal}>
      <ShareContent />
    </Modal>
  );
};

export default ShareCategoryModal;
