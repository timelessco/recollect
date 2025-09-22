import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useDeleteUserMutation from "../../async/mutationHooks/user/useDeleteUserMutation";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { SearchLoader } from "../../components/search-loader";
import BackIconBlack from "../../icons/actionIcons/backIconBlack";
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
import { delete_cookie } from "../../utils/helpers";
import { errorToast, successToast } from "../../utils/toastMessages";

type SettingsFormTypes = {
	confirmText: string;
};

const DeleteAccout = () => {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const router = useRouter();

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
				// await signOut(supabase);
				delete_cookie("supabase-auth-token", document);
				// await router?.push(LOGIN_URL);
				window?.location.reload();
			}
		}
	};

	return (
		<>
			<div className="relative mb-[34px] flex items-center">
				<Button
					className="absolute left-[-7px] rounded-full p-1"
					onClick={() => setCurrentSettingsPage("main")}
				>
					<figure>
						<BackIconBlack />
					</figure>
				</Button>
				<div className={`${settingsMainHeadingClassName} ml-[21px]`}>
					Delete account confirmation
				</div>
			</div>
			<div className=" border-b-[1px] border-b-gray-light-4 pb-6 ">
				<p className={settingsSubHeadingClassName}>
					Are you sure you want to delete your account ?
				</p>
				<p className={`${settingsParagraphClassName} mt-1`}>
					This action will delete all your data, collections, tags what all you
					have uploaded using this application. Please do proceed with caution
				</p>
			</div>
			<form
				className="mt-6 flex items-end justify-between sm:flex-col"
				onSubmit={handleSubmit(onSubmit)}
			>
				<div className="w-[70%] sm:w-full">
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
								placeholder="Enter text"
							/>
						</div>
					</LabelledComponent>
				</div>
				<Button
					className={`w-[150px] sm:mt-5 sm:w-full ${settingsDeleteButtonRedClassName}`}
					onClick={handleSubmit(onSubmit)}
				>
					<div className="flex w-full items-center justify-center">
						<figure className="mr-2">
							<TrashIconRed />
						</figure>
						<p className="flex w-full justify-center  sm:w-[100px]">
							{deleteUserMutation?.isLoading ? (
								<SearchLoader
									className="h-3 w-3 animate-spin"
									style={{ color: "red" }}
								/>
							) : (
								"Confirm delete"
							)}
						</p>
					</div>
				</Button>
			</form>
		</>
	);
};

export default DeleteAccout;
