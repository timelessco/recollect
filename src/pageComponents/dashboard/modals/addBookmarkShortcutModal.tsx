import isEmpty from 'lodash/isEmpty';
import { SubmitHandler, useForm } from 'react-hook-form';
import Input from '../../../components/atoms/input';
import LabelledComponent from '../../../components/labelledComponent';
import Modal from '../../../components/modal';
import Spinner from '../../../components/spinner';
import { useModalStore } from '../../../store/componentStore';
import { URL_PATTERN } from '../../../utils/constants';

interface AddBookarkShortcutModalProps {
  onAddBookmark: (url: string) => void;
  isAddBookmarkLoading: boolean;
}

const AddBookarkShortcutModal = (props: AddBookarkShortcutModalProps) => {
  const { onAddBookmark, isAddBookmarkLoading } = props;
  const showAddBookmarkShortcutModal = useModalStore(
    (state) => state.showAddBookmarkShortcutModal
  );

  const toggleShowAddBookmarkShortcutModal = useModalStore(
    (state) => state.toggleShowAddBookmarkShortcutModal
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ url: string }>();
  const onSubmit: SubmitHandler<{ url: string }> = (data) => {
    onAddBookmark(data.url);
    reset({ url: '' });
  };

  return (
    <Modal
      open={showAddBookmarkShortcutModal}
      setOpen={toggleShowAddBookmarkShortcutModal}
    >
      {isAddBookmarkLoading ? (
        <div className="flex justify-center">
          <Spinner />
        </div>
      ) : (
        <LabelledComponent label="Add URL">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register('url', {
                required: true,
                pattern: URL_PATTERN,
              })}
              placeholder="Add URL"
              className=""
              isError={!isEmpty(errors)}
              errorText="Enter valid URL"
              id="add-url-input"
            />
          </form>
        </LabelledComponent>
      )}
    </Modal>
  );
};

export default AddBookarkShortcutModal;
