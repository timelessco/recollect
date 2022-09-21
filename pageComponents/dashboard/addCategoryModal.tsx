import { SubmitHandler, useForm } from 'react-hook-form';
import Input from '../../components/atoms/input';
import LabelledComponent from '../../components/labelledComponent';
import Modal from '../../components/modal';
import { useModalStore } from '../../store/componentStore';
import isEmpty from 'lodash/isEmpty';

interface AddCategoryModalFromTypes {
  newCategoryName: string;
}

interface AddCategoryModalProps {
  onAddNewCategory: (newCategoryName: string) => void;
}

const AddCategoryModal = (props: AddCategoryModalProps) => {
  const { onAddNewCategory } = props;

  const showCategoryModal = useModalStore(
    (state) => state.showAddCategoryModal
  );

  const toggleAddCategoryModal = useModalStore(
    (state) => state.toggleAddCategoryModal
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddCategoryModalFromTypes>();
  const onSubmit: SubmitHandler<AddCategoryModalFromTypes> = (data) => {
    onAddNewCategory(data?.newCategoryName);
    reset({ newCategoryName: '' });
    toggleAddCategoryModal();
  };

  return (
    <Modal open={showCategoryModal} setOpen={toggleAddCategoryModal}>
      <div>
        <LabelledComponent label="New category name">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register('newCategoryName', {
                required: true,
              })}
              placeholder="Enter name"
              isError={!isEmpty(errors)}
              errorText="Name cannot be empty"
              className=""
            />
          </form>
        </LabelledComponent>
      </div>
    </Modal>
  );
};

export default AddCategoryModal;
