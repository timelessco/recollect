import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import { useQueryClient } from "@tanstack/react-query";

import type { SettingsPage } from "@/pageComponents/dashboard/modals/settings-modal";
import type { ProfilesTableTypes } from "@/types/apiTypes";

import useDeleteUserMutation from "../../async/mutationHooks/user/use-delete-user-mutation";
import { signOut } from "../../async/supabaseCrudHelpers";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { BackIconBlack } from "../../icons/actionIcons/backIconBlack";
import { TrashIconGray } from "../../icons/trash-icon-gray";
import { useSupabaseSession } from "../../store/componentStore";
import {
  settingsDeleteButtonRedClassName,
  settingsInputClassName,
  settingsInputContainerClassName,
  settingsInputLabelClassName,
  settingsMainHeadingClassName,
  settingsParagraphClassName,
  settingsSubHeadingClassName,
} from "../../utils/commonClassNames";
import { LOGIN_URL, USER_PROFILE } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast, successToast } from "../../utils/toastMessages";

interface SettingsFormTypes {
  confirmText: string;
}

interface DeleteAccountProps {
  onNavigate: (page: SettingsPage) => void;
}

export const DeleteAccount = ({ onNavigate }: DeleteAccountProps) => {
  const session = useSupabaseSession((state) => state.session);
  const setSession = useSupabaseSession((state) => state.setSession);
  const queryClient = useQueryClient();
  const router = useRouter();
  const supabase = createClient();

  const { deleteUserMutation } = useDeleteUserMutation();

  const userProfilesData = queryClient.getQueryData<{ data: ProfilesTableTypes[] | null }>([
    USER_PROFILE,
    session?.user?.id,
  ])!;

  const userData = userProfilesData?.data?.[0];
  const {
    formState: { errors },
    handleSubmit,
    register,
    // reset,
  } = useForm<SettingsFormTypes>({
    defaultValues: {
      confirmText: "",
    },
  });

  const onSubmit: SubmitHandler<SettingsFormTypes> = async (data) => {
    if (userData?.user_name !== data?.confirmText) {
      errorToast("The username does not match");
    } else {
      try {
        await deleteUserMutation.mutateAsync();
        successToast("Account has been successfully deleted");
        // Sign out to clear all Supabase auth cookies
        await signOut(supabase);
        // Clear the session state
        setSession(undefined);
        // Redirect to login page
        void router.push(`/${LOGIN_URL}`);
      } catch {
        errorToast("Failed to delete account. Please try again.");
      }
    }
  };

  return (
    <>
      <div className="relative mb-[34px] flex items-center">
        <Button
          className="absolute left-[-7px] rounded-full bg-gray-0 p-1 hover:bg-gray-100"
          onClick={() => {
            onNavigate("main");
          }}
        >
          <figure className="text-gray-900">
            <BackIconBlack />
          </figure>
        </Button>
        <div className={`${settingsMainHeadingClassName} ml-[21px]`}>
          Delete account confirmation
        </div>
      </div>
      <div className="border-b border-b-gray-200 pb-6">
        <p className={settingsSubHeadingClassName}>
          Are you sure you want to delete your account ?
        </p>
        <p className={`${settingsParagraphClassName} mt-2`}>
          This action will delete all your data, collections, tags what all you have uploaded using
          this application. Please do proceed with caution
        </p>
      </div>
      <form
        className="mt-6 flex flex-wrap items-end justify-between sm:flex-nowrap"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
      >
        <LabelledComponent
          label={`Please type your username ${userData?.user_name} to continue`}
          labelClassName={settingsInputLabelClassName}
        >
          <div className={settingsInputContainerClassName}>
            <Input
              errorClassName=" absolute w-full top-[29px]"
              {...register("confirmText", {
                required: {
                  message: "Please add the confirm text",
                  value: true,
                },
              })}
              className={settingsInputClassName}
              errorText={errors?.confirmText?.message ?? ""}
              id="confirmText"
              isError={Boolean(errors?.confirmText)}
              placeholder="Enter username"
            />
          </div>
        </LabelledComponent>
        <div className="mt-2 flex w-1/2 justify-start sm:mt-0 sm:justify-end">
          <Button
            buttonType="submit"
            className={` ${settingsDeleteButtonRedClassName} ${deleteUserMutation.isPending ? "py-[9px]" : ""}`}
            isDisabled={deleteUserMutation.isPending}
            onClick={() => {
              void handleSubmit(onSubmit)();
            }}
          >
            <div className="flex w-full min-w-[125px] items-center justify-center">
              <div className="flex justify-center text-red-600">
                {deleteUserMutation.isPending ? (
                  <Spinner className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <figure className="mr-2">
                      <TrashIconGray className="size-4" />
                    </figure>
                    Confirm delete
                  </>
                )}
              </div>
            </div>
          </Button>
        </div>
      </form>
    </>
  );
};
