import { useEffect, useRef } from "react";
import classNames from "classnames";
import { isNil, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUploadProfilePicMutation from "../../async/mutationHooks/settings/useUploadProfilePicMutation";
import useDeleteUserMutation from "../../async/mutationHooks/user/useDeleteUserMutation";
import useRemoveUserProfilePicMutation from "../../async/mutationHooks/user/useRemoveUserProfilePicMutation";
import useUpdateUsernameMutation from "../../async/mutationHooks/user/useUpdateUsernameMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import UserAvatar from "../../components/userAvatar";
import { WarningIconRed } from "../../icons/actionIcons/warningIconRed";
import ImageIcon from "../../icons/imageIcon";
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
} from "../../utils/constants";
import { errorToast, successToast } from "../../utils/toastMessages";

import { SettingsEmailCard } from "./settings-email-card";
import { SettingsIframeToggle } from "./settings-iframe-toggle";
import { ToggleDarkMode } from "@/components/toggleDarkMode";
import { type SettingsPage } from "@/pageComponents/dashboard/modals/settings-modal";
import { useSupabaseSession } from "@/store/componentStore";

type SettingsUsernameFormTypes = {
	username: string;
};

type SettingsDisplaynameFormTypes = {
	displayname: string;
};

type SettingsProps = {
	onNavigate: (page: SettingsPage) => void;
};

const Settings = ({ onNavigate }: SettingsProps) => {
	const inputFile = useRef<HTMLInputElement>(null);
	const session = useSupabaseSession((state) => state.session);

	const { userProfileData } = useFetchUserProfile();

	// mutations
	const { updateUsernameMutation } = useUpdateUsernameMutation();

	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	const { uploadProfilePicMutation } = useUploadProfilePicMutation();
	const { deleteUserMutation } = useDeleteUserMutation();
	const { removeProfilePic } = useRemoveUserProfilePicMutation();

	const userData = userProfileData?.data?.[0];

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
				<div className="flex w-full items-center space-x-3">
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
						<figure className="h-11.5 w-11.5 cursor-pointer transition ease-in-out hover:opacity-50">
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
								className={`px-2 py-[7px] ${saveButtonClassName}`}
								onClick={() => {
									if (inputFile.current) {
										inputFile.current.click();
									}
								}}
							>
								<div className="flex items-center space-x-[6px]">
									<ImageIcon size="16" />
									<span className="text-13 leading-[115%] font-medium">
										Upload image
									</span>
								</div>
							</Button>
							<Button
								className="rounded-lg bg-gray-100 px-2.5 py-[7px] text-13 leading-[115%] font-medium tracking-normal text-gray-800 hover:bg-gray-200"
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
					<form
						className="w-1/2"
						onSubmit={displaynameHandleSubmit(onDisplaynameSubmit)}
					>
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
									className={`px-2 py-[4.5px] ${saveButtonClassName} rounded-[5px] ${
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
					<form className="w-1/2" onSubmit={handleSubmit(onSubmit)}>
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
											message: "Only lowercase letters and numbers, no spaces",
										},
									})}
									className={settingsInputClassName}
									errorText={errors?.username?.message ?? ""}
									id="username"
									isError={Boolean(errors?.username)}
									placeholder="Enter username"
								/>
								<Button
									className={`px-2 py-[4.5px] ${saveButtonClassName} rounded-[5px] ${
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
				<SettingsEmailCard onNavigate={onNavigate} />
				<SettingsIframeToggle />
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
							onClick={() => onNavigate("delete")}
						>
							<p className="flex w-full justify-center">
								<span className="flex items-center justify-center gap-1.5 text-red-600">
									{deleteUserMutation?.isPending ? (
										<Spinner
											className="h-3 w-3 animate-spin"
											style={{ color: "var(--color-red-600)" }}
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
