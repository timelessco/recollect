import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import BackIconBlack from "../../icons/actionIcons/backIconBlack";
import MailIconBlack from "../../icons/miscellaneousIcons/mailIconBlack";
import { useMiscellaneousStore } from "../../store/componentStore";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { EMAIL_CHECK_PATTERN, USER_PROFILE } from "../../utils/constants";

type SettingsFormTypes = {
	newEmail: string;
};

const onSubmit: SubmitHandler<SettingsFormTypes> = async () => {
	// console.log("d", data);
};

const ChangeEmail = () => {
	const queryClient = useQueryClient();
	const session = useSession();
	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const userProfilesData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = !isEmpty(userProfilesData?.data)
		? userProfilesData?.data[0]
		: {};

	const {
		register,
		handleSubmit,
		formState: { errors },
		// reset,
	} = useForm<SettingsFormTypes>({
		defaultValues: {
			newEmail: "",
		},
	});

	return (
		<>
			<div className="relative mb-[30px] flex items-center">
				<Button
					className="absolute left-[-7px] rounded-full p-1"
					onClick={() => setCurrentSettingsPage("main")}
				>
					<figure>
						<BackIconBlack />
					</figure>
				</Button>
				<div className={`${settingsMainHeadingClassName} ml-[21px]`}>
					Change email
				</div>
			</div>
			<div className="border-b-[1px] border-b-custom-gray-9 pb-[28px] ">
				<LabelledComponent
					label="Current email"
					labelClassName={settingsInputLabelClassName}
				>
					<div className={settingsInputContainerClassName}>
						<figure className=" mr-2">
							<MailIconBlack />
						</figure>
						<Input
							className={`${settingsInputClassName} cursor-not-allowed`}
							disabled
							errorText=""
							id="currentEmail"
							isError={false}
							placeholder="Enter current email"
							value={userData?.email}
						/>
					</div>
				</LabelledComponent>
			</div>
			<form
				className="flex items-center justify-between pt-[28px]"
				onSubmit={handleSubmit(onSubmit)}
			>
				<LabelledComponent
					label="Change new email"
					labelClassName={settingsInputLabelClassName}
				>
					<div className={settingsInputContainerClassName}>
						<Input
							errorClassName="absolute w-full top-[29px]"
							{...register("newEmail", {
								required: {
									value: true,
									message: "email cannot be empty",
								},
								pattern: {
									value: EMAIL_CHECK_PATTERN,
									message: "Please enter valid email",
								},
							})}
							className={settingsInputClassName}
							errorText={errors?.newEmail?.message ?? ""}
							id="newEmail"
							isError={Boolean(errors?.newEmail)}
							placeholder="Enter email address"
						/>
					</div>
				</LabelledComponent>
				<div className="flex w-1/2 justify-end">
					<Button
						className="px-[10px] py-2 text-sm leading-4"
						onClick={handleSubmit(onSubmit)}
						type="dark"
					>
						Change email
					</Button>
				</div>
			</form>
		</>
	);
};

export default ChangeEmail;
