import { useSession } from "@supabase/auth-helpers-react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find, isEmpty, isNull } from "lodash";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUpdateCategoryOptimisticMutation from "../../../async/mutationHooks/category/useUpdateCategoryOptimisticMutation";
import useDeleteSharedCategoriesUserMutation from "../../../async/mutationHooks/share/useDeleteSharedCategoriesUserMutation";
import useUpdateSharedCategoriesUserAccessMutation from "../../../async/mutationHooks/share/useUpdateSharedCategoriesUserAccessMutation";
import { sendCollaborationEmailInvite } from "../../../async/supabaseCrudHelpers";
import AriaSelect from "../../../components/ariaSelect";
import Input from "../../../components/atoms/input";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import GlobeIcon from "../../../icons/globeIcon";
import LinkIcon from "../../../icons/linkIcon";
import type {
  CategoriesData,
  CollabDataInCategory,
} from "../../../types/apiTypes";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { CATEGORIES_KEY, EMAIL_CHECK_PATTERN } from "../../../utils/constants";
import { getUserNameFromEmail } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";

const GiveAccessDropdown = () => {
  return (
    <AriaSelect
      defaultValue="View"
      options={[
        { label: "Editor", value: "Editor" },
        { label: "View", value: "View" },
      ]}
      disabled
      onOptionClick={() => {}}
    />
  );
};

const AccessUserInfo = (props: { item: CollabDataInCategory }) => {
  const session = useSession();
  const { item } = props;

  const { updateSharedCategoriesUserAccessMutation } =
    useUpdateSharedCategoriesUserAccessMutation();

  const { deleteSharedCategoriesUserMutation } =
    useDeleteSharedCategoriesUserMutation();

  return (
    <div className="flex items-center justify-between py-[5px] px-2">
      <div className="flex items-center justify-between">
        <div className=" h-5 w-5 rounded-full bg-slate-200" />
        <p className=" ml-[6px] text-13 font-450 leading-[15px] text-custom-gray-1">
          {item.userEmail}
        </p>
      </div>
      <div>
        {item.isOwner ? (
          <p className="text-13 font-medium leading-[15px] text-custom-gray-10">
            Owner
          </p>
        ) : (
          <AriaSelect
            defaultValue={item.edit_access ? "Can Edit" : "Can View"}
            options={[
              { label: "Can Edit", value: "Can Edit" },
              { label: "Can View", value: "Can View" },
              { label: "No Access", value: "No Access" },
            ]}
            onOptionClick={async value => {
              if (value !== "No Access") {
                const res = (await mutationApiCall(
                  updateSharedCategoriesUserAccessMutation.mutateAsync({
                    id: item.share_id as number,
                    updateData: {
                      edit_access: !!parseInt(
                        value === "Can Edit" ? "1" : "0",
                        10,
                      ),
                    },
                    session,
                  }),
                )) as { error: Error };

                if (isNull(res?.error)) {
                  successToast("User role changed");
                }
              } else {
                mutationApiCall(
                  deleteSharedCategoriesUserMutation.mutateAsync({
                    id: item.share_id as number,
                    session,
                  }),
                )?.catch(() => {});
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

interface EmailInput {
  email: string;
}

const ShareContent = () => {
  const [publicUrl, setPublicUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const queryClient = useQueryClient();
  const session = useSession();
  const { category_id: categoryId } = useGetCurrentCategoryId();

  const { updateCategoryOptimisticMutation } =
    useUpdateCategoryOptimisticMutation();

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
  }, [session?.user.id, categoryId]);

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
        category_id: categoryId as number,
        hostUrl: window?.location?.origin,
        userId: session?.user.id as unknown as string,
        session,
      });
      reset({ email: "" });
      successToast("Invite sent");
    } catch (e) {
      errorToast("Something went wrong");
    }
  };

  const categoryData = queryClient.getQueryData([
    CATEGORIES_KEY,
    session?.user.id,
  ]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const currentCategory = find(
    categoryData?.data,
    item => item?.id === categoryId,
  );

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          {...register("email", {
            required: true,
            pattern: EMAIL_CHECK_PATTERN,
          })}
          placeholder="Enter emails or names"
          wrapperClassName="py-[7px] px-[10px] bg-custom-gray-11 rounded-lg flex items-center justify-between relative"
          className="rounded-none  bg-transparent text-sm leading-4 shadow-none outline-none"
          errorText={errors.email ? "Enter valid email" : ""}
          isError={!isEmpty(errors)}
          rendedRightSideElement={<GiveAccessDropdown />}
          errorClassName="ml-2"
          errorIconClassName="right-[48px]"
        />
      </form>

      <div className=" pt-3">
        <p className=" px-2 py-[6px] text-xs font-450 leading-[14px] text-custom-gray-10">
          People with access
        </p>
        <div className="pb-2">
          {currentCategory?.collabData?.map(item => (
            <AccessUserInfo item={item} />
          ))}
        </div>
        <div className="mx-2 flex items-end justify-between border-y-[1px] border-custom-gray-11 py-[15.5px]">
          <div className=" flex items-center">
            <figure>
              <GlobeIcon />
            </figure>

            <p className="ml-[6px] text-13 font-450 leading-[15px] text-custom-gray-1">
              Anyone with link
            </p>
          </div>
          <AriaSelect
            defaultValue={
              currentCategory?.is_public ? "View access" : "No access"
            }
            options={[
              { label: "View access", value: "View access" },
              { label: "No access", value: "No access" },
            ]}
            onOptionClick={async value => {
              await mutationApiCall(
                updateCategoryOptimisticMutation.mutateAsync({
                  category_id: categoryId,
                  updateData: {
                    is_public: value === "View access",
                  },
                  session,
                }),
              )?.catch(() => {});
              setLinkCopied(false);
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={() => {}}
          className={`flex items-center p-2 ${
            currentCategory?.is_public ? " cursor-pointer" : " opacity-50"
          }`}
          onClick={() => {
            if (currentCategory?.is_public) {
              navigator.clipboard.writeText(publicUrl)?.catch(() => {});
              setLinkCopied(true);
            }
          }}
        >
          <figure>
            <LinkIcon />
          </figure>
          <p className="ml-[6px] text-13 font-450 leading-[15px] text-custom-gray-1">
            {linkCopied ? "Link copied" : "Copy link"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareContent;
