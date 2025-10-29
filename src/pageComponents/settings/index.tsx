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
import { Switch } from "../../components/toggledarkmode";
import UserAvatar from "../../components/userAvatar";
import TrashIconRed from "../../icons/actionIcons/trashIconRed";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import ImageIcon from "../../icons/imageIcon";
import { InfoIcon } from "../../icons/infoIcon";
import MailIconBlack from "../../icons/miscellaneousIcons/mailIconBlack";
import { PCLogo } from "../../icons/pcLogo";
import SettingsUserIcon from "../../icons/user/settingsUserIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import {
	saveButtonClassName,
	settingsDeleteButtonRedClassName,
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsLightButtonClassName,
	settingsMainHeadingClassName,
	settingsParagraphClassName,
	settingsSubHeadingClassName,
} from "../../utils/commonClassNames";
import {
	DISPLAY_NAME_CHECK_PATTERN,
	LETTERS_NUMBERS_CHECK_PATTERN,
	USER_PROFILE,
} from "../../utils/constants";
import { errorToast, successToast } from "../../utils/toastMessages";

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
		reset,
	} = useForm<SettingsUsernameFormTypes>({
		defaultValues: {
			username: "",
		},
	});

	const {
		register: displayNameRegister,
		handleSubmit: displaynameHandleSubmit,
		formState: { errors: displaynameError },
		reset: displaynameReset,
	} = useForm<SettingsDisplaynameFormTypes>({
		defaultValues: {
			displayname: "",
		},
	});

	useEffect(() => {
		reset({ username: userData?.user_name });
	}, [reset, userData?.user_name]);

	useEffect(() => {
		displaynameReset({ displayname: userData?.display_name });
	}, [displaynameReset, userData?.display_name]);

	const profilePicClassName = classNames({
		[`rounded-full min-w-[72px] min-h-[72px] max-w-[72px] max-h-[72px] object-contain bg-black`]:
			true,
		"opacity-50":
			uploadProfilePicMutation?.isLoading || removeProfilePic?.isLoading,
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
						// eslint-disable-next-line unicorn/numeric-separators-style
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
				<div className="flex w-full items-center space-x-2 sm:flex-col">
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
						<figure className="h-[72px] w-[72px] cursor-pointer transition delay-75 ease-in-out hover:opacity-50">
							<UserAvatar
								alt="profile-pic"
								className={profilePicClassName}
								height={72}
								src={userData?.profile_pic ?? ""}
								width={72}
							/>
						</figure>
					</div>
					<div className="sm:mt-2">
						<div className=" flex gap-2 text-sm font-semibold leading-[21px] text-black">
							<Button
								className={`px-2 py-[6px] ${saveButtonClassName}`}
								onClick={() => {
									if (inputFile.current) {
										inputFile.current.click();
									}
								}}
							>
								<div className="flex items-center space-x-[6px] ">
									<ImageIcon />
									<span>Upload image</span>
								</div>
							</Button>
							<Button
								className="bg-gray-100  px-2 py-[6px] text-[13px] font-[500] leading-[115%] tracking-normal text-gray-800 hover:bg-gray-200"
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
				<div className="mt-[44px] flex flex-row gap-3">
					<form onSubmit={handleSubmit(onSubmit)}>
						<LabelledComponent
							label="Username"
							labelClassName={settingsInputLabelClassName}
						>
							<div className={settingsInputContainerClassName}>
								<figure className="mr-2">
									<SettingsUserIcon />
								</figure>
								<Input
									autoFocus={false}
									errorClassName=" absolute  top-[29px]"
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
								<button
									className={`px-2 py-[4.5px] ${saveButtonClassName}`}
									type="submit"
								>
									Save
								</button>
							</div>
						</LabelledComponent>
					</form>
					<form onSubmit={displaynameHandleSubmit(onDisplaynameSubmit)}>
						<LabelledComponent
							label="Display name"
							labelClassName={settingsInputLabelClassName}
						>
							<div className={`${settingsInputContainerClassName} w-full`}>
								<figure className=" mr-2">
									<SettingsUserIcon />
								</figure>
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
											message: "Should not have special charecters",
										},
									})}
									className={settingsInputClassName}
									errorText={displaynameError?.displayname?.message ?? ""}
									id="displayname"
									isError={Boolean(displaynameError?.displayname)}
									placeholder="Enter display name"
								/>
								<button
									className={`px-2 py-[4.5px] ${saveButtonClassName}`}
									type="submit"
								>
									Save
								</button>
							</div>
						</LabelledComponent>
					</form>
				</div>
				{/* <Switch /> */}
				<div className="pt-10">
					<p className="pb-[10px] text-[14px] font-[500] leading-[115%] text-gray-900">
						Email
					</p>
					<div className="flex items-center justify-between rounded-lg bg-gray-100 sm:flex-col">
						<div className="sm:flex sm:w-full sm:items-center sm:justify-between">
							<div className="ml-[19.5px] flex items-center gap-2 rounded-lg">
								{session?.user?.app_metadata?.provider === "email" ? (
									<MailIconBlack />
								) : (
									<GoogleLoginIcon />
								)}
								<p
									className={`my-2 ml-2 text-gray-900  ${settingsParagraphClassName}`}
								>
									{userData?.email}
									<p className="mt-1 text-[14px] font-[400] leading-[115%] text-gray-600">
										Current email
									</p>
								</p>
							</div>
						</div>
						<Button
							className={`mr-[10px] sm:mt-5 ${settingsLightButtonClassName}`}
							onClick={() => setCurrentSettingsPage("change-email")}
							type="light"
						>
							{session?.user?.app_metadata?.provider === "email"
								? "Change email"
								: "Disconnect"}
						</Button>
					</div>
					{session?.user?.app_metadata?.provider !== "email" && (
						<p className="mt-2 flex items-center gap-x-2 text-[13px] font-[400] leading-[150%] text-gray-600">
							<InfoIcon />
							You have logged in with your Google account.
						</p>
					)}
				</div>
				{/* 
				feature yet to implement
				<div className="pt-10">
					<p className="pb-[10px] text-[14px] font-[500] leading-[115%] text-gray-900">
						Active devices
					</p>
					<div className="flex items-center justify-between rounded-lg bg-gray-100 sm:flex-col">
						<div className="  flex  flex-row sm:w-full">
							<div className="my-[10px] ml-[19.5px] flex  gap-2 rounded-lg">
								<PCLogo />
								<p className={settingsParagraphClassName}>
									Chrome on macOS
									<p className="mt-1 text-[14px] font-[400]  text-gray-600">
										Chennai, India
									</p>
								</p>
							</div>
							<div className="ml-2 mt-[9px] h-5 rounded-2xl bg-gray-50 px-1.5 py-[3px] text-[12px] font-[500] leading-[115%] text-[#18794E]">
								This Device
							</div>
						</div>
					</div>
				</div> */}
				<Switch />
				<div className="pt-10">
					<p className=" text-[14px] font-[500] leading-[115%] text-gray-900">
						Delete Account
					</p>
					<div className="flex flex-col  justify-between">
						<p className="my-[10px] text-[14px] font-[400] leading-[150%] text-gray-800">
							If you no longer wish to use recollect, you can permanently delete
							your account.
						</p>
						<Button
							className={`w-full sm:mt-5 ${settingsDeleteButtonRedClassName}`}
							onClick={() => setCurrentSettingsPage("delete")}
						>
							<p className="flex w-full justify-center  sm:w-[105px]">
								<figure className="mr-2">
									<TrashIconRed />
								</figure>
								{deleteUserMutation?.isLoading ? (
									<Spinner
										className="h-3 w-3 animate-spin"
										style={{ color: "red" }}
									/>
								) : (
									"Delete my account"
								)}
							</p>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Settings;
