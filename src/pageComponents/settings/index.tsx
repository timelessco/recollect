import { useEffect, useRef } from "react";
import Image from "next/image";
import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { isEmpty, isNull } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import useUploadProfilePicMutation from "../../async/mutationHooks/settings/useUploadProfilePicMutation";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import { mutationApiCall } from "../../utils/apiHelpers";
import { grayInputClassName } from "../../utils/commonClassNames";
import { defaultBlur, USER_PROFILE } from "../../utils/constants";

type SettingsFormTypes = {
	username: string;
};

const onSubmit: SubmitHandler<SettingsFormTypes> = () => {
	// console.log("submit", data);
};

const Settings = () => {
	const inputFile = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const session = useSession();
	const userId = session?.user?.id;

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};
	const { uploadProfilePicMutation } = useUploadProfilePicMutation();

	const userData = !isEmpty(userProfilesData?.data)
		? userProfilesData?.data[0]
		: {};

	const inputWidth = "w-[580px]";

	const userNameInputClassName = classNames({
		[grayInputClassName]: true,
		[inputWidth]: true,
	});

	// const userEmailInputClassName = classNames({
	// 	[grayInputClassName]: true,
	// 	[inputWidth]: true,
	// 	"cursor-not-allowed": true,
	// });

	const {
		register,
		handleSubmit,
		// formState: { errors },
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
		"rounded-full  w-[100px] h-[100px] object-cover": true,
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
						).catch((error) => console.error(error));
					}
				}}
				ref={inputFile}
				style={{ display: "none" }}
				type="file"
			/>
			<div className="space-y-8 p-6">
				<div className=" flex items-center space-x-8">
					<figure className=" h-[100px] w-[100px]">
						<Image
							alt="profile-pic"
							blurDataURL={defaultBlur}
							className={profilePicClassName}
							height={100}
							src={userData?.profile_pic ?? ""}
							width={100}
						/>
					</figure>
					<div>
						<Button
							className="px-2 py-3 text-white"
							onClick={() => {
								if (inputFile.current) {
									inputFile.current.click();
								}
							}}
							type="dark"
						>
							Change Avatar
						</Button>
						<p className="mt-2 text-xs font-[450] leading-4 text-custom-gray-1">
							JPG, GIF or PNG. 1MB max.
						</p>
					</div>
				</div>
				<form onSubmit={handleSubmit(onSubmit)}>
					<LabelledComponent label="Username">
						<Input
							{...register("username", {
								required: true,
							})}
							className={userNameInputClassName}
							errorText=""
							id="username"
							isError={false}
							placeholder="Enter username"
						/>
					</LabelledComponent>
					{/* <LabelledComponent label="User email">
					<Input
						className={userEmailInputClassName}
						disabled
						errorText=""
						isError={false}
						placeholder="Enter user email"
						value={userData?.email}
					/>
				</LabelledComponent> */}
				</form>
			</div>
		</>
	);
};

export default Settings;
