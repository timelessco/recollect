import { useEffect, useRef } from "react";
import Image from "next/image";
import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { isEmpty, isNil, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUploadProfilePicMutation from "../../async/mutationHooks/settings/useUploadProfilePicMutation";
import useUpdateUsernameMutation from "../../async/mutationHooks/user/useUpdateUsernameMutation";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import UserAvatar from "../../components/userAvatar";
import TrashIconRed from "../../icons/actionIcons/trashIconRed";
import DotIcon from "../../icons/miscellaneousIcons/dotIcon";
import SettingsUserIcon from "../../icons/user/settingsUserIcon";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { defaultBlur, USER_PROFILE } from "../../utils/constants";
import { successToast } from "../../utils/toastMessages";

type SettingsFormTypes = {
	username: string;
};

const Settings = () => {
	const inputFile = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const session = useSession();
	const userId = session?.user?.id;

	// mutations
	const { updateUsernameMutation } = useUpdateUsernameMutation();
	const { uploadProfilePicMutation } = useUploadProfilePicMutation();

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = !isEmpty(userProfilesData?.data)
		? userProfilesData?.data[0]
		: {};

	const onSubmit: SubmitHandler<SettingsFormTypes> = async (data) => {
		try {
			const response = await mutationApiCall(
				updateUsernameMutation.mutateAsync({
					id: session?.user?.id as string,
					username: data?.username,
					session,
				}),
			);
			if (!isNil(response?.data)) {
				successToast("User name has been updated");
			}
		} catch (error) {
			console.error(error);
		}
	};

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<SettingsFormTypes>({
		defaultValues: {
			username: "",
		},
	});

	useEffect(() => {
		reset({ username: userData?.user_name });
	}, [reset, userData?.user_name]);

	const profilePicClassName = classNames({
		[`rounded-full min-w-[72px] min-h-[72px] max-w-[72px] max-h-[72px] object-contain bg-black`]:
			true,
		"opacity-50": uploadProfilePicMutation?.isLoading,
	});

	return (
		<>
			<input
				id="file"
				onChange={(event) => {
					const uploadedFile = event?.target?.files
						? event?.target?.files[0]
						: null;
					if (!isNull(uploadedFile)) {
						mutationApiCall(
							uploadProfilePicMutation.mutateAsync({
								file: uploadedFile,
								session,
							}),
						)
							.then(() => successToast("Profile pic has been updated"))
							.catch((error) => console.error(error));
					}
				}}
				ref={inputFile}
				style={{ display: "none" }}
				type="file"
			/>
			<div>
				<p className=" mb-[30px] text-base font-semibold leading-[18px] text-black">
					My Profile
				</p>
				<div className="flex w-full items-center space-x-4">
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
					<div>
						<div className=" flex text-sm font-semibold leading-[21px] text-black">
							<p>Upload new photo</p>
							<p className="mx-1 flex items-center">
								<DotIcon />
							</p>
							<p>Remove</p>
						</div>
						<div className=" mt-1 text-13 font-[420] leading-[15px] text-custom-gray-10">
							<p>Photos help people recognize you</p>
						</div>
					</div>
				</div>
				<form
					className="border-b-[1px] border-b-custom-gray-9 pb-[28px] pt-5"
					onSubmit={handleSubmit(onSubmit)}
				>
					<LabelledComponent
						label="Name"
						labelClassName=" text-custom-gray-10 font-[420] text-sm leading-4 tracking-[0.02em] mb-[6px]"
					>
						<div className="relative flex w-[280px] items-center rounded-lg bg-custom-gray-8 px-[10px] py-2">
							<figure className=" mr-2">
								<SettingsUserIcon />
							</figure>
							<Input
								errorClassName=" absolute w-full top-[29px]"
								{...register("username", {
									required: {
										value: true,
										message: "Username cannot be empty",
									},
									minLength: {
										value: 4,
										message: "Username must have a minimum of 4 characters",
									},
								})}
								className="rounded-none bg-custom-gray-8 text-sm font-[420] leading-4 tracking-[0.02em] text-custom-gray-1  outline-none"
								errorText={errors?.username?.message ?? ""}
								id="username"
								isError={Boolean(errors?.username)}
								placeholder="Enter username"
							/>
						</div>
					</LabelledComponent>
				</form>
				<div className="border-b-[1px] border-b-custom-gray-9  pb-6 pt-[25px]">
					<p className="pb-4 text-base font-semibold leading-[18px] tracking-[1.5%] text-black">
						Account security
					</p>
					<div className="flex items-center justify-between">
						<div>
							<p className=" text-sm font-medium leading-4 tracking-[1.5%] text-custom-gray-5">
								Email
							</p>
							<p className="mt-1 text-sm font-[420] leading-[21px] tracking-[2%] text-custom-gray-10">
								{userData?.email}
							</p>
						</div>
						<Button
							className="rounded-lg bg-custom-gray-8 px-2 py-[6px] text-sm font-[420] leading-4 tracking-[2%] text-custom-gray-1 hover:bg-slate-100"
							type="light"
						>
							Change email
						</Button>
					</div>
				</div>
				<div className="pt-6">
					<p className="pb-4 text-base font-semibold leading-[18px] tracking-[1.5%] text-black">
						Danger zone
					</p>
					<div className="flex items-center justify-between">
						<div className="w-[70%]">
							<p className=" text-sm font-medium leading-4 tracking-[1.5%] text-custom-gray-5">
								Delete account
							</p>
							<p className="mt-1 w-[90%] text-sm font-[420] leading-[21px] tracking-[2%] text-custom-gray-10">
								By deleting your account, you’ll not be able to log in and all
								the content you have uploaded will be lost and will not be able
								to be recovered.
							</p>
						</div>
						<Button className=" bg-custom-red-100 px-2 py-[6px] text-sm font-[420] leading-4 tracking-[2%] text-custom-red-700 hover:bg-red-100">
							<figure className="mr-2">
								<TrashIconRed />
							</figure>
							<p>Delete account</p>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Settings;
