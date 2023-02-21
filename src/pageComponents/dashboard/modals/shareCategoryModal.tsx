import Modal from "../../../components/modal";
import { useModalStore } from "../../../store/componentStore";
import ShareContent from "../share/shareContent";

const ShareCategoryModal = () => {
  const showShareCategoryModal = useModalStore(
    state => state.showShareCategoryModal,
  );

  const toggleShareCategoryModal = useModalStore(
    state => state.toggleShareCategoryModal,
  );

  return (
    <Modal open={showShareCategoryModal} onClose={toggleShareCategoryModal}>
      <ShareContent />
    </Modal>
  );
};

export default ShareCategoryModal;
