import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import { TrashIcon } from "@heroicons/react/20/solid";
import { find, isEmpty, isNull } from "lodash";

import type { CollabDataInCategory } from "../../../types/apiTypes";

import { cn } from "@/utils/tailwind-merge";

import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/use-delete-shared-categories-user-mutation";
import useSendCollaborationEmailInviteMutation from "../../../async/mutationHooks/share/use-send-collaboration-email-invite-mutation";
import useFetchCategories from "../../../async/queryHooks/category/use-fetch-categories";
import useGetUserProfilePic from "../../../async/queryHooks/user/use-get-user-profile-pic";
import Input from "../../../components/atoms/input";
import { Spinner } from "../../../components/spinner";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { CopyIcon } from "../../../icons/copy-icon";
import { GlobeIcon } from "../../../icons/globe-icon";
import { DefaultUserIcon } from "../../../icons/user/defaultUserIcon";
import { useMiscellaneousStore, useSupabaseSession } from "../../../store/componentStore";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { EMAIL_CHECK_PATTERN } from "../../../utils/constants";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { SharePublicSwitch } from "./share-public-switch";
import { AccessRoleSelect, InviteRoleSelect } from "./share-role-selects";

const rightTextStyles = "text-13 font-medium leading-[15px] text-gray-600";

const AccessUserInfo = (props: { isLoggedinUserTheOwner: boolean; item: CollabDataInCategory }) => {
  const { isLoggedinUserTheOwner, item } = props;
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const { deleteSharedCategoriesUserMutation } = useDeleteSharedCategoriesUserMutation();

  const renderRightContent = () => {
    if (item.is_accept_pending) {
      return (
        <div className="flex items-center space-x-1">
          <p className={rightTextStyles}>pending</p>
          {isLoggedinUserTheOwner && (
            <figure>
              <TrashIcon
                className="h-4 w-4 cursor-pointer text-red-400 hover:text-red-600"
                onClick={() => {
                  if (isLoggedinUserTheOwner) {
                    void mutationApiCall(
                      deleteSharedCategoriesUserMutation.mutateAsync({
                        id: item.share_id!,
                      }),
                    );
                  } else {
                    errorToast(
                      "You cannot perform this action as you are not the owner of this collection",
                    );
                  }
                }}
              />
            </figure>
          )}
        </div>
      );
    }

    return item.isOwner ? (
      <p className={rightTextStyles}>Owner</p>
    ) : (
      <AccessRoleSelect isLoggedinUserTheOwner={isLoggedinUserTheOwner} item={item} />
    );
  };

  const { userProfilePicData } = useGetUserProfilePic(item?.userEmail);

  const profilePicUrl = userProfilePicData?.[0]?.profile_pic;
  const hasProfilePic = !isNull(userProfilePicData) && profilePicUrl;

  const showDefaultIcon = !hasProfilePic || imageError || imageLoading;

  return (
    <div className="flex items-center justify-between px-2 py-[7.5px]">
      <div className="flex items-center justify-between">
        <div className="relative h-5 w-5">
          {showDefaultIcon && <DefaultUserIcon className="h-5 w-5" />}
          {hasProfilePic && profilePicUrl && (
            <Image
              alt="profile-pic"
              className="h-5 w-5 rounded-full object-cover"
              height={20}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => {
                setImageLoading(false);
              }}
              src={profilePicUrl}
              style={{
                visibility: imageLoading || imageError ? "hidden" : "visible",
              }}
              width={20}
            />
          )}
        </div>
        <p className="ml-[6px] w-[171px] truncate text-13 leading-[15px] font-450 text-gray-800">
          {item.userEmail}
        </p>
      </div>
      <div>{renderRightContent()}</div>
    </div>
  );
};

interface EmailInput {
  email: string;
}

interface ShareContentProps {
  categoryId?: null | number | string;
}

const ShareContent = (props: ShareContentProps) => {
  const [publicUrl, setPublicUrl] = useState("");
  const [inviteUserEditAccess, setInviteUserEditAccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const session = useSupabaseSession((state) => state.session);
  const { category_id: currentCategoryId } = useGetCurrentCategoryId();
  const { allCategories: categoryData } = useFetchCategories();

  const shareCategoryId = useMiscellaneousStore((state) => state.shareCategoryId);
  // Priority: props.categoryId > shareCategoryId > currentCategoryId
  const dynamicCategoryId = props.categoryId ?? shareCategoryId ?? currentCategoryId;

  const { sendCollaborationEmailInviteMutation } = useSendCollaborationEmailInviteMutation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const categorySlug = currentCategory?.category_slug;
      const userName = currentCategory?.user_id?.user_name;
      const url = `${window?.location?.origin}/public/${userName}/${categorySlug}`;
      setPublicUrl(url);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, dynamicCategoryId]);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<EmailInput>();

  // this resets all the state
  useEffect(() => {
    setInviteUserEditAccess(false);
    setLinkCopied(false);
    reset({ email: "" });
  }, [reset]);

  const onSubmit: SubmitHandler<EmailInput> = async (data) => {
    const emailList = data?.email?.split(",");
    try {
      const [email] = emailList;

      const isEmailExist = find(currentCategory?.collabData, (item) => item?.userEmail === email);

      if (!isEmailExist) {
        await mutationApiCall(
          sendCollaborationEmailInviteMutation.mutateAsync({
            category_id: dynamicCategoryId as number,
            edit_access: inviteUserEditAccess,
            emailList,
            hostUrl: window?.location?.origin,
          }),
        );

        reset({ email: "" });
        successToast("Invite sent");
      } else {
        errorToast("This email is already a collaborator");
      }
    } catch {
      errorToast("Something went wrong");
    }
  };

  const currentCategory = find(categoryData ?? [], (item) => item?.id === dynamicCategoryId);

  const isUserTheCategoryOwner = currentCategory?.user_id?.id === session?.user?.id;

  const inputClassName = cn({
    "cursor-not-allowed": !isUserTheCategoryOwner,
    "rounded-none bg-transparent text-sm leading-4 text-gray-800 shadow-none outline-none placeholder:text-gray-alpha-600": true,
  });

  return (
    <div>
      {!isUserTheCategoryOwner && (
        <p className="p-2 text-xs text-red-600">
          Actions cannot be performed as you are not the collection owner
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
      >
        <Input
          {...register("email", {
            pattern: EMAIL_CHECK_PATTERN,
            required: true,
          })}
          className={inputClassName}
          errorClassName="ml-2"
          errorIconClassName="right-[48px]"
          errorText={errors.email ? "Enter valid email" : ""}
          isDisabled={!isUserTheCategoryOwner}
          isError={!isEmpty(errors)}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing || event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            if (sendCollaborationEmailInviteMutation.isPending) {
              return;
            }

            void handleSubmit(onSubmit)();
          }}
          placeholder="Enter emails or names"
          rendedRightSideElement={
            sendCollaborationEmailInviteMutation?.isPending ? (
              <div className="my-[7px] flex items-center px-2">
                <Spinner className="h-3 w-3 animate-spin text-gray-0" />
              </div>
            ) : (
              <InviteRoleSelect
                disabled={!isUserTheCategoryOwner}
                onChange={setInviteUserEditAccess}
                value={inviteUserEditAccess}
              />
            )
          }
          wrapperClassName="py-0.5 pl-[10px] pr-0.5 bg-gray-alpha-100 rounded-lg flex items-center justify-between relative"
        />
      </form>
      <div className="pt-3">
        <p className="px-2 py-[6px] text-xs leading-[14px] font-450 text-gray-500">
          People with access
        </p>
        <div className="pb-2">
          {[...(currentCategory?.collabData ?? [])]
            .toSorted((a, b) => {
              // Move owner to the top
              if (a.isOwner) {
                return -1;
              }

              if (b.isOwner) {
                return 1;
              }

              return 0;
            })
            .map((item) => (
              <AccessUserInfo
                isLoggedinUserTheOwner={isUserTheCategoryOwner}
                item={item}
                key={item.userEmail}
              />
            ))}
        </div>
        <div className="mx-2 flex items-center justify-between border-t py-2">
          <button
            className={`flex items-center ${
              currentCategory?.is_public ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            }`}
            onClick={() => {
              if (currentCategory?.is_public) {
                void navigator.clipboard.writeText(publicUrl);
                setLinkCopied(true);
              }
            }}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && currentCategory?.is_public) {
                void navigator.clipboard.writeText(publicUrl);
                setLinkCopied(true);
              }
            }}
            tabIndex={currentCategory?.is_public ? 0 : -1}
            type="button"
          >
            <figure className="flex items-center justify-center text-gray-900">
              <GlobeIcon className="ml-0.5 h-4 w-4" />
            </figure>
            <p className="ml-[6px] text-13 leading-[15px] font-450 text-gray-800">Public link</p>
            <span className="mx-1.5 text-gray-600">•</span>
            <p className="text-13 leading-[15px] font-450 text-gray-600">
              {linkCopied ? "Copied" : "Copy"}
            </p>
            <figure className="ml-1 flex items-center justify-center">
              <CopyIcon className="h-[13px] w-[13px]" />
            </figure>
          </button>
          {isUserTheCategoryOwner ? (
            <SharePublicSwitch categoryId={props.categoryId} />
          ) : (
            <div className={rightTextStyles}>
              {currentCategory?.is_public ? "View access" : "No access"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareContent;
