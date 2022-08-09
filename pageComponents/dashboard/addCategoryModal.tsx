import Modal from '../../components/modal';
import { useModalStore } from '../../store/componentStore';

const AddCategoryModal = () => {
  const showCategoryModal = useModalStore(
    (state) => state.showAddCategoryModal
  );

  const toggleAddCategoryModal = useModalStore(
    (state) => state.toggleAddCategoryModal
  );

  return (
    <Modal open={showCategoryModal} setOpen={toggleAddCategoryModal}>
      <div>add cat</div>
    </Modal>
  );
};

export default AddCategoryModal;
