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
import DotIcon from "../../icons/miscellaneousIcons/dotIcon";
import SettingsUserIcon from "../../icons/user/settingsUserIcon";
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
				<p className={`${settingsMainHeadingClassName} mb-[30px]`}>
					My Profile
				</p>
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
						<div className=" flex text-sm font-semibold leading-[21px] text-black">
							<Button
								className="bg-transparent py-0 text-sm font-semibold leading-[21px] text-gray-900 hover:bg-gray-200"
								onClick={() => {
									if (inputFile.current) {
										inputFile.current.click();
									}
								}}
							>
								Upload new photo
							</Button>
							<p className="flex items-center">
								<DotIcon />
							</p>
							<Button
								className="bg-transparent py-0 text-sm font-semibold leading-[21px] text-gray-900 hover:bg-gray-200"
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
						<div className="ml-2 mt-1 text-13 font-[420] leading-[15px] text-gray-700">
							<p>Photos help people recognize you</p>
						</div>
					</div>
				</div>
				<form
					className="flex items-end border-b-[1px] border-b-gray-200 pb-[28px] pt-5 sm:flex-col"
					onSubmit={handleSubmit(onSubmit)}
				>
					<LabelledComponent
						label="Username"
						labelClassName={settingsInputLabelClassName}
					>
						<div className={settingsInputContainerClassName}>
							<figure className=" mr-2">
								<SettingsUserIcon />
							</figure>
							<Input
								autoFocus={false}
								errorClassName=" absolute w-full top-[29px]"
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
						</div>
					</LabelledComponent>
					<div className="flex min-w-[150px] max-w-[150px] justify-end sm:mt-5 sm:w-full sm:min-w-0 sm:max-w-full">
						<Button
							className={settingsLightButtonClassName}
							onClick={handleSubmit(onSubmit)}
							type="light"
						>
							Change username
						</Button>
					</div>
				</form>
				<form
					className="flex items-end border-b-[1px] border-b-gray-200 pb-[28px] pt-5 sm:flex-col"
					onSubmit={displaynameHandleSubmit(onDisplaynameSubmit)}
				>
					<LabelledComponent
						label="Display name"
						labelClassName={settingsInputLabelClassName}
					>
						<div className={settingsInputContainerClassName}>
							<figure className=" mr-2">
								<SettingsUserIcon />
							</figure>
							<Input
								autoFocus={false}
								errorClassName="absolute w-full top-[29px]"
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
						</div>
					</LabelledComponent>
					<div className="flex min-w-[150px] max-w-[150px] justify-end sm:mt-5 sm:w-full sm:min-w-0 sm:max-w-full">
						<Button
							className={settingsLightButtonClassName}
							onClick={displaynameHandleSubmit(onDisplaynameSubmit)}
							type="light"
						>
							Change name
						</Button>
					</div>
				</form>
				<Switch />
				<div className="border-b-[1px] border-b-gray-200  pb-6 pt-[25px]">
					<p className="pb-4 text-base font-semibold leading-[18px] tracking-[1.5%] text-gray-900">
						Account security
					</p>
					{session?.user?.app_metadata?.provider === "	" ? (
						<div className="flex items-center justify-between sm:flex-col">
							<div className="sm:flex sm:w-full sm:items-center sm:justify-between">
								<p className={settingsSubHeadingClassName}>Email</p>
								<p className={`mt-1 sm:mt-0 ${settingsParagraphClassName}`}>
									{userData?.email}
								</p>
							</div>
							<Button
								className={`sm:mt-5 ${settingsLightButtonClassName}`}
								onClick={() => setCurrentSettingsPage("change-email")}
								type="light"
							>
								Change email
							</Button>
						</div>
					) : (
						<div className={settingsParagraphClassName}>
							You have logged in using google auth with this email{" "}
							{userData?.email}
						</div>
					)}
				</div>
				<form
					className="flex items-end border-b-[1px] border-b-gray-light-4 pb-[28px] pt-5 sm:flex-col"
					onSubmit={displaynameHandleSubmit(onDisplaynameSubmit)}
				>
					<div className=" min-w-[250px] max-w-[250px]  sm:mt-5 sm:w-full sm:min-w-0 sm:max-w-full">
						<Button
							className={settingsLightButtonClassName}
							onClick={() => setCurrentSettingsPage("api-key")}
							type="light"
						>
							Bring your own api key
						</Button>
					</div>
				</form>
				<div className="pt-6">
					<p className="pb-4 text-base font-semibold leading-[18px] tracking-[1.5%] text-gray-900">
						Danger zone
					</p>
					<div className="flex items-center justify-between sm:flex-col">
						<div className="w-[70%] sm:w-full">
							<p className={`sm:mb-2 ${settingsSubHeadingClassName}`}>
								Delete account
							</p>
							<p className={`mt-1 w-[90%] ${settingsParagraphClassName}`}>
								By deleting your account, you’ll not be able to log in and all
								the content you have uploaded will be lost and will not be able
								to be recovered.
							</p>
						</div>
						<Button
							className={`w-[150px]  sm:mt-5 sm:w-full ${settingsDeleteButtonRedClassName}`}
							onClick={() => setCurrentSettingsPage("delete")}
						>
							<div className="flex w-full justify-center ">
								<figure className="mr-2">
									<TrashIconRed />
								</figure>
								<p className="flex w-full justify-center sm:w-[105px]">
									{deleteUserMutation?.isLoading ? (
										<Spinner
											className="h-3 w-3 animate-spin"
											style={{ color: "red" }}
										/>
									) : (
										"Delete account"
									)}
								</p>
							</div>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Settings;
