import { useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNil } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import Spinner from "../../components/spinner";
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
import { errorToast, successToast } from "../../utils/toastMessages";

type SettingsFormTypes = {
	newEmail: string;
};

const ChangeEmail = () => {
	const [changeEmailLoader, setChangeEmailLoader] = useState(false);

	const queryClient = useQueryClient();
	const session = useSession();
	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const supabase = useSupabaseClient();

	const userProfilesData = queryClient.getQueryData([
		USER_PROFILE,
		session?.user?.id,
	]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const userData = userProfilesData?.data?.[0];

	const onSubmit: SubmitHandler<SettingsFormTypes> = async (data) => {
		setChangeEmailLoader(true);

		const { error } = await supabase.auth.updateUser({ email: data.newEmail });

		if (!isNil(error)) {
			errorToast(error.message);
		}

		if (isNil(error)) {
			successToast("Comformation email sent", "userInvite");
		}

		setChangeEmailLoader(false);
	};

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
			<div className="border-b-[1px] border-b-gray-light-4 pb-[28px] ">
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
				className="flex items-end justify-between pt-[28px] sm:flex-col"
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
				<div className="flex w-1/2 justify-end sm:w-full">
					<Button
						className="flex w-[111px] justify-center px-[9px] py-2 text-sm leading-4 sm:mt-5 sm:w-full"
						isDisabled={changeEmailLoader}
						onClick={handleSubmit(onSubmit)}
						type="dark"
					>
						{changeEmailLoader ? <Spinner /> : "Change email"}
					</Button>
				</div>
			</form>
		</>
	);
};

export default ChangeEmail;
