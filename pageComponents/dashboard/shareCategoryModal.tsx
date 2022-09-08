import { ExternalLinkIcon, TrashIcon } from '@heroicons/react/solid';
import { PostgrestError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import find from 'lodash/find';
import isNull from 'lodash/isNull';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
import LabelledComponent from '../../components/labelledComponent';
import Modal from '../../components/modal';
import Switch from '../../components/switch';
import Tabs from '../../components/tabs';
import {
  useMiscellaneousStore,
  useModalStore,
} from '../../store/componentStore';
import { CategoriesData } from '../../types/apiTypes';
import {
  CATEGORIES_KEY,
  GET_NAME_FROM_EMAIL_PATTERN,
} from '../../utils/constants';
import { SubmitHandler, useForm } from 'react-hook-form';
import isEmpty from 'lodash/isEmpty';
import { sendCollaborationEmailInvite } from '../../utils/supabaseCrudHelpers';
import Select from '../../components/atoms/select';

interface ShareCategoryModalProps {
  userId: string;
  onPublicSwitch: (value: boolean, category_id: number | null | string) => void;
  onDeleteUserClick: (id: number) => void;
  updateSharedCategoriesUserAccess: (id: number, value: string) => void;
}

interface EmailInput {
  email: string;
}

const ShareCategoryModal = (props: ShareCategoryModalProps) => {
  const {
    userId,
    onPublicSwitch,
    onDeleteUserClick,
    updateSharedCategoriesUserAccess,
  } = props;

  const [publicUrl, setPublicUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [currentTab, setCurrentTab] = useState<string | number>('public');
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailInput>();

  const onSubmit: SubmitHandler<EmailInput> = (data) => {
    const emailList = data?.email?.split(',');
    sendCollaborationEmailInvite({
      emailList,
      edit_access: false,
      category_id: shareCategoryId as number,
      hostUrl: window?.location?.origin,
    });
    reset({ email: '' });
  };

  useEffect(() => {
    setIsPublic(currentCategory?.is_public || false);
  }, [currentCategory]);

  useEffect(() => {
    if (typeof window !== undefined) {
      const categorySlug = currentCategory?.category_slug;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const userName = currentCategory?.user_id?.email
        ?.match(GET_NAME_FROM_EMAIL_PATTERN)[1]
        ?.replace('.', '-');

      const url = `${window?.location?.origin}/${userName}/${categorySlug}`;
      setPublicUrl(url);
    }
  }, [userId, shareCategoryId]);

  const showShareCategoryModal = useModalStore(
    (state) => state.showShareCategoryModal
  );

  const toggleShareCategoryModal = useModalStore(
    (state) => state.toggleShareCategoryModal
  );

  const isUserOwnerOfCategory = userId === currentCategory?.user_id?.id;

  const renderPublicShare = () => {
    return (
      <>
        <div className="flex space-x-4 items-center mb-3">
          <p>Public</p>
          <Switch
            disabled={!isUserOwnerOfCategory}
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
        {!isUserOwnerOfCategory && (
          <p className="text-sm mt-3">
            *Only category owner can update public access
          </p>
        )}
      </>
    );
  };

  const renderCollabShare = () => {
    return (
      <>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            {...register('email', {
              required: true,
              // pattern: URL_PATTERN,
            })}
            placeholder="Enter emails seperated by commas"
            className=""
            isError={!isEmpty(errors)}
            errorText=""
          />
        </form>
        <div className="mt-6">
          {currentCategory?.collabData?.map((item) => {
            return (
              <div
                key={item?.share_id}
                className=" py-2 px-1 rounded-lg  hover:bg-gray-100 flex justify-between items-center"
              >
                <p className="text-sm text-gray-900 truncate">
                  {item?.userEmail}
                </p>
                {/* for owner just show owner text */}
                {!isNull(item?.share_id) ? (
                  <>
                    {' '}
                    <Select
                      options={[
                        { name: 'Read', value: 0 },
                        { name: 'Edit', value: 1 },
                      ]}
                      defaultValue={item?.edit_access ? 1 : 0}
                      onChange={(e) =>
                        !isNull(item?.share_id) &&
                        updateSharedCategoriesUserAccess(
                          item?.share_id,
                          e.target.value
                        )
                      }
                    />
                    <TrashIcon
                      onClick={() =>
                        !isNull(item?.share_id) &&
                        onDeleteUserClick(item?.share_id)
                      }
                      className="flex-shrink-0 h-4 w-4 text-red-400 hover:text-red-500 cursor-pointer"
                    />{' '}
                  </>
                ) : (
                  <p className="text-sm font-bold text-gray-900 truncate">
                    Owner
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Modal open={showShareCategoryModal} setOpen={toggleShareCategoryModal}>
      <div>
        <Tabs
          tabs={[
            {
              name: 'Public Share',
              current: currentTab === 'public',
              value: 'public',
            },
            {
              name: 'Collaboration',
              current: currentTab === 'collaboration',
              value: 'collaboration',
            },
          ]}
          onTabClick={(value) => setCurrentTab(value)}
        />
        <div className="my-5">
          {currentTab === 'public' ? renderPublicShare() : renderCollabShare()}
        </div>
      </div>
    </Modal>
  );
};

export default ShareCategoryModal;
