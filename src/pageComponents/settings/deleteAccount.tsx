import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useDeleteUserMutation from "../../async/mutationHooks/user/useDeleteUserMutation";
import { signOut } from "../../async/supabaseCrudHelpers";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { BackIconBlack } from "../../icons/actionIcons/backIconBlack";
import TrashIconRed from "../../icons/actionIcons/trashIconRed";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
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

type SettingsFormTypes = {
	confirmText: string;
};

export const DeleteAccount = () => {
	const session = useSupabaseSession((state) => state.session);
	const setSession = useSupabaseSession((state) => state.setSession);
	const queryClient = useQueryClient();
	const router = useRouter();
	const supabase = createClient();

	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const { deleteUserMutation } = useDeleteUserMutation();

	const userProfilesData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = userProfilesData?.data?.[0];
	const {
		register,
		handleSubmit,
		formState: { errors },
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
			const response = await mutationApiCall(deleteUserMutation.mutateAsync());

			if (isNull(response?.error)) {
				successToast("Account has been successfully deleted");
				// Sign out to clear all Supabase auth cookies
				await signOut(supabase);
				// Clear the session state
				setSession(undefined);
				// Redirect to login page
				void router.push(`/${LOGIN_URL}`);
			}
		}
	};

	return (
		<>
			<div className="relative mb-[34px] flex items-center">
				<Button
					className="absolute left-[-7px] rounded-full bg-gray-0 p-1 hover:bg-gray-100"
					onClick={() => setCurrentSettingsPage("main")}
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
					This action will delete all your data, collections, tags what all you
					have uploaded using this application. Please do proceed with caution
				</p>
			</div>
			<form
				className="mt-6 flex flex-wrap items-end justify-between sm:flex-nowrap"
				onSubmit={handleSubmit(onSubmit)}
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
									value: true,
									message: "Please add the confirm text",
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
						className={`${settingsDeleteButtonRedClassName}`}
						isDisabled={deleteUserMutation.isPending}
						buttonType="submit"
						onClick={handleSubmit(onSubmit)}
					>
						<div className="flex w-full items-center justify-center">
							<figure className="mr-2">
								<TrashIconRed />
							</figure>
							<p className="flex justify-center">
								{deleteUserMutation.isPending ? (
									<Spinner className="h-3 w-3 animate-spin text-red-600" />
								) : (
									"Confirm delete"
								)}
							</p>
						</div>
					</Button>
				</div>
			</form>
		</>
	);
};
