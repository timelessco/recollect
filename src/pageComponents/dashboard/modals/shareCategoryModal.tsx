import { ExternalLinkIcon, TrashIcon } from "@heroicons/react/solid";
import { useSession } from "@supabase/auth-helpers-react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { sendCollaborationEmailInvite } from "../../../async/supabaseCrudHelpers";
import Input from "../../../components/atoms/input";
import Select from "../../../components/atoms/select";
import LabelledComponent from "../../../components/labelledComponent";
import Modal from "../../../components/modal";
import Switch from "../../../components/switch";
import Tabs from "../../../components/tabs";
import {
  useMiscellaneousStore,
  useModalStore,
} from "../../../store/componentStore";
import type { CategoriesData } from "../../../types/apiTypes";
import { CATEGORIES_KEY } from "../../../utils/constants";
import { getUserNameFromEmail } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";

interface ShareCategoryModalProps {
  userId: string;
  onPublicSwitch: (value: boolean, category_id: number | null | string) => void;
  onDeleteUserClick: (id: number) => void;
  updateSharedCategoriesUserAccess: (
    id: number,
    value: string,
  ) => Promise<void>;
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

  const session = useSession();

  const [publicUrl, setPublicUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [currentTab, setCurrentTab] = useState<string | number>("public");
  const queryClient = useQueryClient();

  const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const shareCategoryId = useMiscellaneousStore(state => state.shareCategoryId);

  const currentCategory = find(
    categoryData?.data,
    item => item?.id === shareCategoryId,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailInput>();

  const onSubmit: SubmitHandler<EmailInput> = async data => {
    const emailList = data?.email?.split(",");
    try {
      await sendCollaborationEmailInvite({
        emailList,
        edit_access: false,
        category_id: shareCategoryId as number,
        hostUrl: window?.location?.origin,
        userId,
        session,
      });
      reset({ email: "" });
      successToast("Invite sent");
    } catch (e) {
      errorToast("Something went wrong");
    }
  };

  useEffect(() => {
    setIsPublic(currentCategory?.is_public || false);
  }, [currentCategory]);

  useEffect(() => {
    if (typeof window !== undefined) {
      const categorySlug = currentCategory?.category_slug as string;
      const userName = getUserNameFromEmail(
        currentCategory?.user_id?.email || "",
      ) as string;
      const url = `${window?.location?.origin}/${userName}/${categorySlug}`;
      setPublicUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, shareCategoryId]);

  const showShareCategoryModal = useModalStore(
    state => state.showShareCategoryModal,
  );

  const toggleShareCategoryModal = useModalStore(
    state => state.toggleShareCategoryModal,
  );

  const isUserOwnerOfCategory = userId === currentCategory?.user_id?.id;

  const renderPublicShare = () => {
    return (
      <>
        <div className="mb-3 flex items-center space-x-4">
          <p>Public</p>
          <Switch
            size="large"
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
            <div className="flex w-full items-center space-x-2">
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
                <ExternalLinkIcon className="h-8 w-8 cursor-pointer text-gray-400 hover:text-gray-500" />
              </a>
            </div>
          </LabelledComponent>
        )}
        {!isUserOwnerOfCategory && (
          <p className="mt-3 text-sm">
            *Only category owner can update public access
          </p>
        )}
      </>
    );
  };

  const renderCollabShare = () => {
    return (
      <>
        {/* disabling as handleSubmit is part on react forms */}
        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            {...register("email", {
              required: true,
              // pattern: URL_PATTERN,
            })}
            placeholder="Enter emails seperated by commas"
            className="px-2 py-1"
            isError={!isEmpty(errors)}
            errorText=""
            id="collab-email-input"
          />
        </form>
        <div className="mt-6">
          {currentCategory?.collabData?.map(item => {
            return (
              <div
                key={item?.share_id}
                className=" flex items-center justify-between  rounded-lg py-2 px-1 hover:bg-gray-100"
              >
                <p className="truncate text-sm text-gray-900">
                  {item?.userEmail}
                </p>
                {/* for owner just show owner text */}
                {!isNull(item?.share_id) ? (
                  <>
                    {" "}
                    <Select
                      id="collab-access-select"
                      options={[
                        { name: "Read", value: 0 },
                        { name: "Edit", value: 1 },
                      ]}
                      defaultValue={item?.edit_access ? 1 : 0}
                      onChange={e =>
                        !isNull(item?.share_id)
                          ? updateSharedCategoriesUserAccess(
                              item?.share_id,
                              e.target.value,
                            )
                          : undefined
                      }
                    />
                    <TrashIcon
                      onClick={() =>
                        !isNull(item?.share_id) &&
                        onDeleteUserClick(item?.share_id)
                      }
                      className="h-4 w-4 shrink-0 cursor-pointer text-red-400 hover:text-red-500"
                    />{" "}
                  </>
                ) : (
                  <p className="truncate text-sm font-bold text-gray-900">
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
    <Modal open={showShareCategoryModal} onClose={toggleShareCategoryModal}>
      <div>
        <Tabs
          tabs={[
            {
              name: "Public Share",
              current: currentTab === "public",
              value: "public",
            },
            {
              name: "Collaboration",
              current: currentTab === "collaboration",
              value: "collaboration",
            },
          ]}
          onTabClick={value => setCurrentTab(value)}
        />
        <div className="my-5">
          {currentTab === "public" ? renderPublicShare() : renderCollabShare()}
        </div>
      </div>
    </Modal>
  );
};

export default ShareCategoryModal;
