import { ExternalLinkIcon } from '@heroicons/react/solid';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { find } from 'lodash';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
import LabelledComponent from '../../components/labelledComponent';
import Modal from '../../components/modal';
import Switch from '../../components/switch';
import {
  useMiscellaneousStore,
  useModalStore,
} from '../../store/componentStore';
import { CategoriesData } from '../../types/apiTypes';
import { CATEGORIES_KEY } from '../../utils/constants';

interface ShareCategoryModalProps {
  userId: string;
  onPublicSwitch: (value: boolean, category_id: number | null | string) => void;
}

const ShareCategoryModal = (props: ShareCategoryModalProps) => {
  const { userId, onPublicSwitch } = props;

  const [publicUrl, setPublicUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const queryClient = useQueryClient();

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const shareCategoryId = useMiscellaneousStore(
    (state) => state.shareCategoryId
  );

  const currentCategory = find(
    categoryData?.data,
    (item) => item?.id === shareCategoryId
  );

  useEffect(() => {
    setIsPublic(currentCategory?.is_public || false);
  }, [currentCategory]);

  useEffect(() => {
    if (typeof window !== undefined) {
      const url = `${window?.location?.origin}/${userId}/${shareCategoryId}`;
      setPublicUrl(url);
    }
  }, [userId, shareCategoryId]);

  const showShareCategoryModal = useModalStore(
    (state) => state.showShareCategoryModal
  );

  const toggleShareCategoryModal = useModalStore(
    (state) => state.toggleShareCategoryModal
  );

  return (
    <Modal open={showShareCategoryModal} setOpen={toggleShareCategoryModal}>
      <div>
        <p className="text-lg font-medium">Share</p>
        <div className="flex space-x-4 items-center my-5">
          <p>Public</p>
          <Switch
            enabled={isPublic}
            setEnabled={() => {
              setIsPublic(!isPublic);
              onPublicSwitch(!isPublic, shareCategoryId || null);
            }}
          />
        </div>
        {isPublic && (
          <LabelledComponent label="Public URL">
            <div className="flex items-center w-full space-x-2">
              <Input
                className=""
                isError={false}
                errorText=""
                isDisabled
                value={publicUrl}
                placeholder=""
              />
              <a
                target="_blank"
                rel="noreferrer"
                href={publicUrl}
                className="cursor-pointer"
              >
                <ExternalLinkIcon className="h-8 w-8 text-gray-400 cursor-pointer hover:text-gray-500" />
              </a>
            </div>
          </LabelledComponent>
        )}
      </div>
    </Modal>
  );
};

export default ShareCategoryModal;
