import { useEffect, useRef } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { isNil, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUploadProfilePicMutation from "../../async/mutationHooks/settings/useUploadProfilePicMutation";
import useDeleteUserMutation from "../../async/mutationHooks/user/useDeleteUserMutation";
import useRemoveUserProfilePicMutation from "../../async/mutationHooks/user/useRemoveUserProfilePicMutation";
import useUpdateUsernameMutation from "../../async/mutationHooks/user/useUpdateUsernameMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import UserAvatar from "../../components/userAvatar";
import { WarningIconRed } from "../../icons/actionIcons/warningIconRed";
import { GoogleLoginIcon } from "../../icons/googleLoginIcon";
import { IframeIcon } from "../../icons/iframe-icon";
import ImageIcon from "../../icons/imageIcon";
import { InfoIcon } from "../../icons/info-icon";
import { MailIconBlack } from "../../icons/miscellaneousIcons/mailIconBlack";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { useIframeStore } from "../../store/iframeStore";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	saveButtonClassName,
	settingsDeleteButtonRedClassName,
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import {
	DISPLAY_NAME_CHECK_PATTERN,
	LETTERS_NUMBERS_CHECK_PATTERN,
	USER_PROFILE,
} from "../../utils/constants";
import { errorToast, successToast } from "../../utils/toastMessages";

import { SettingsToggleCard } from "./settingsToggleCard";
import { ToggleDarkMode } from "@/components/toggleDarkMode";

type SettingsUsernameFormTypes = {
	username: string;
};

type SettingsDisplaynameFormTypes = {
	displayname: string;
};

const Settings = () => {
	const inputFile = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const userId = session?.user?.id;

	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	// mutations
	const { updateUsernameMutation } = useUpdateUsernameMutation();

	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	const { uploadProfilePicMutation } = useUploadProfilePicMutation();
	const { deleteUserMutation } = useDeleteUserMutation();
	const { removeProfilePic } = useRemoveUserProfilePicMutation();

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};
	const iframeEnabled = useIframeStore((state) => state.iframeEnabled);
	const setIframeEnabled = useIframeStore((state) => state.setIframeEnabled);

	const userData = userProfilesData?.data?.[0];

	const onSubmit: SubmitHandler<SettingsUsernameFormTypes> = async (data) => {
		if (data?.username === userData?.user_name) {
			errorToast("Username is the same as before");
			return;
		}

		try {
			const response = await mutationApiCall(
				updateUsernameMutation.mutateAsync({
					id: session?.user?.id as string,
					username: data?.username,
				}),
			);
			if (!isNil(response?.data)) {
				successToast("User name has been updated");
			}
		} catch (error) {
			console.error(error);
		}
	};

	const onDisplaynameSubmit: SubmitHandler<
		SettingsDisplaynameFormTypes
	> = async (data) => {
		if (data?.displayname === userData?.display_name) {
			errorToast("Display name is the same as before");
			return;
		}

		try {
			const response = await mutationApiCall(
				updateUserProfileOptimisticMutation.mutateAsync({
					updateData: { display_name: data?.displayname },
				}),
			);

			if (!isNil(response?.data)) {
				successToast("Display name has been updated");
			}
		} catch (error) {
			console.error(error);
			errorToast("Something went wrong");
		}
	};

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		reset,
	} = useForm<SettingsUsernameFormTypes>({
		defaultValues: {
			username: "",
		},
	});

	const usernameValue = watch("username");
	const originalUsername = userData?.user_name ?? "";

	const {
		register: displayNameRegister,
		handleSubmit: displaynameHandleSubmit,
		formState: { errors: displaynameError },
		reset: displaynameReset,
		watch: displaynameWatch,
	} = useForm<SettingsDisplaynameFormTypes>({
		defaultValues: {
			displayname: "",
		},
	});

	const displaynameValue = displaynameWatch("displayname");
	const originalDisplayname = userData?.display_name ?? "";

	useEffect(() => {
		reset({ username: userData?.user_name });
	}, [reset, userData?.user_name]);

	useEffect(() => {
		displaynameReset({ displayname: userData?.display_name });
	}, [displaynameReset, userData?.display_name]);

	const profilePicClassName = classNames({
		[`rounded-full w-11.5 h-11.5 object-contain bg-black`]: true,
		"opacity-50":
			uploadProfilePicMutation?.isPending || removeProfilePic?.isPending,
	});

	return (
		<>
			<input
				id="file"
				onChange={async (event) => {
					const uploadedFile = event?.target?.files
						? event?.target?.files[0]
						: null;

					const size = uploadedFile?.size as number;

					if (!isNull(uploadedFile)) {
						if (size < 1000000) {
							// file size is less than 1mb
							const response = await mutationApiCall(
								uploadProfilePicMutation.mutateAsync({
									file: uploadedFile,
								}),
							);

							if (isNull(response?.error)) {
								successToast("Profile pic has been updated");
							}
						} else {
							errorToast("File size is greater then 1MB");
						}
					}
				}}
				ref={inputFile}
				style={{ display: "none" }}
				type="file"
			/>
			<div>
				<p className={`${settingsMainHeadingClassName} mb-4`}>Account</p>
				<div className="flex w-full items-center space-x-2">
					<div
						onClick={() => {
							if (inputFile.current) {
								inputFile.current.click();
							}
						}}
						onKeyDown={() => {}}
						role="button"
						tabIndex={-1}
					>
						<figure className="cursor-pointer transition delay-75 ease-in-out hover:opacity-50">
							<UserAvatar
								alt="profile-pic"
								className={profilePicClassName}
								height={46}
								src={userData?.profile_pic ?? ""}
								width={46}
							/>
						</figure>
					</div>
					<div className="max-sm:mt-2">
						<div className="flex gap-2 text-sm leading-[21px] font-semibold text-black">
							<Button
								className={`px-2 py-[6px] ${saveButtonClassName}`}
								onClick={() => {
									if (inputFile.current) {
										inputFile.current.click();
									}
								}}
							>
								<div className="flex items-center space-x-[6px]">
									<ImageIcon />
									<span>Upload image</span>
								</div>
							</Button>
							<Button
								className="bg-gray-100 px-2 py-[6px] text-13 leading-[115%] font-medium tracking-normal text-gray-800 hover:bg-gray-200"
								disabledClassName="bg-gray-100 text-gray-400 hover:bg-gray-100"
								isDisabled={isNull(userData?.profile_pic)}
								onClick={async () => {
									const response = await mutationApiCall(
										removeProfilePic.mutateAsync({
											id: userData?.id as string,
										}),
									);

									if (isNull(response?.error)) {
										successToast("Profile pic has been removed");
									}
								}}
							>
								Remove
							</Button>
						</div>
					</div>
				</div>
				<div className="mt-[44px] flex flex-row space-x-3">
					<form className="w-1/2" onSubmit={handleSubmit(onSubmit)}>
						<LabelledComponent
							label="Display name"
							labelClassName={settingsInputLabelClassName}
						>
							<div className={`${settingsInputContainerClassName} w-full`}>
								<Input
									autoFocus={false}
									errorClassName="absolute  top-[29px]"
									tabIndex={-1}
									{...displayNameRegister("displayname", {
										required: {
											value: true,
											message: "Name cannot be empty",
										},
										maxLength: {
											value: 100,
											message: "Name must not exceed 100 characters",
										},
										pattern: {
											value: DISPLAY_NAME_CHECK_PATTERN,
											message: "Should not contain special characters",
										},
									})}
									className={settingsInputClassName}
									errorText={displaynameError?.displayname?.message ?? ""}
									id="displayname"
									isError={Boolean(displaynameError?.displayname)}
									placeholder="Enter display name"
								/>
								<Button
									className={`px-2 py-[4.5px] ${saveButtonClassName} ${
										displaynameValue !== originalDisplayname
											? ""
											: "pointer-events-none invisible"
									}`}
									onClick={displaynameHandleSubmit(onDisplaynameSubmit)}
								>
									Save
								</Button>
							</div>
						</LabelledComponent>
					</form>
					<form
						className="w-1/2"
						onSubmit={displaynameHandleSubmit(onDisplaynameSubmit)}
					>
						<LabelledComponent
							label="Username"
							labelClassName={settingsInputLabelClassName}
						>
							<div className={settingsInputContainerClassName}>
								<Input
									autoFocus={false}
									errorClassName="absolute  top-[29px]"
									tabIndex={-1}
									{...register("username", {
										required: {
											value: true,
											message: "Username cannot be empty",
										},
										minLength: {
											value: 4,
											message: "Username must have a minimum of 4 characters",
										},
										maxLength: {
											value: 100,
											message: "Username must not exceed 100 characters",
										},
										pattern: {
											value: LETTERS_NUMBERS_CHECK_PATTERN,
											message: "Only have lowercase and no blank spaces",
										},
									})}
									className={settingsInputClassName}
									errorText={errors?.username?.message ?? ""}
									id="username"
									isError={Boolean(errors?.username)}
									placeholder="Enter username"
								/>
								<Button
									className={`px-2 py-[4.5px] ${saveButtonClassName} ${
										usernameValue !== originalUsername
											? ""
											: "pointer-events-none invisible"
									}`}
									onClick={handleSubmit(onSubmit)}
								>
									Save
								</Button>
							</div>
						</LabelledComponent>
					</form>
				</div>
				{/* <Switch /> */}
				<div className="pt-10">
					<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
						Email
					</p>
					<SettingsToggleCard
						icon={
							session?.user?.app_metadata?.provider === "email" ? (
								<MailIconBlack className="h-5.5 w-5.5 text-gray-900" />
							) : (
								<GoogleLoginIcon className="h-5 w-5" />
							)
						}
						title={userData?.email}
						description="Current email"
						buttonLabel={
							session?.user?.app_metadata?.provider === "email"
								? "Change email"
								: undefined
						}
						onClick={
							session?.user?.app_metadata?.provider === "email"
								? () => setCurrentSettingsPage("change-email")
								: undefined
						}
					/>
					{session?.user?.app_metadata?.provider !== "email" && (
						<div className="mt-2 flex items-center gap-x-2 text-13 leading-[150%] font-normal text-gray-600">
							<figure className="text-gray-900">
								<InfoIcon className="h-4.5 w-4.5" />
							</figure>
							You have logged in with your Google account.
						</div>
					)}
				</div>
				<div className="pt-10">
					<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
						Iframe
					</p>
					<SettingsToggleCard
						icon={
							<figure className="text-gray-900">
								<IframeIcon className="h-5.5 w-5.5 text-gray-900" />
							</figure>
						}
						title="Enable iframe in lightbox"
						description="Allow embedding external content in lightbox view"
						isSwitch
						enabled={iframeEnabled}
						onToggle={() => {
							setIframeEnabled(!iframeEnabled);
						}}
					/>
				</div>
				<ToggleDarkMode />
				{/*
				feature yet to implement
				<div className="pt-10">
					<p className="pb-[10px] text-[14px] font-medium leading-[115%] text-gray-900">
						Active devices
					</p>
					<div className="flex items-center justify-between rounded-lg bg>
						<div className="  flex  flex-row max-sm:w-full">
							<div className="my-[10px] ml-[19.5px] flex  gap-2 rounded-lg">
								<PCLogo />
								<p className={settingsParagraphClassName}>
									Chrome on macOS
									<p className="mt-1 text-[14px] font-normal  text-gray-600">
										Chennai, India
									</p>
								</p>
							</div>
							<div className="ml-2 mt-[9px] h-5 rounded-2xl bg-gray-50 px-1.5 py-[3px] text-[12px] font-medium leading-[115%] text-[#18794E]">
								This Device
							</div>
						</div>
					</div>
				</div> */}
				<div className="pt-10">
					<p className="text-[14px] leading-[115%] font-medium text-gray-900">
						Delete Account
					</p>
					<div className="flex flex-col justify-between pb-5">
						<p className="my-[10px] text-[14px] leading-[150%] font-normal text-gray-800">
							If you no longer wish to use recollect, you can permanently delete
							your account.
						</p>
						<Button
							className={`w-full ${settingsDeleteButtonRedClassName}`}
							onClick={() => setCurrentSettingsPage("delete")}
						>
							<p className="flex w-full justify-center">
								<span className="flex items-center justify-center gap-1.5">
									{deleteUserMutation?.isPending ? (
										<Spinner
											className="h-3 w-3 animate-spin"
											style={{ color: "#CD2B31" }}
										/>
									) : (
										<>
											<WarningIconRed className="h-3 w-3 shrink-0" />
											Delete my account
										</>
									)}
								</span>
							</p>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Settings;
