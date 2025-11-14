import { useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isNil } from "lodash";
import { useForm, type SubmitHandler } from "react-hook-form";

import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { BackIconBlack } from "../../icons/actionIcons/backIconBlack";
import { MailIconBlack } from "../../icons/miscellaneousIcons/mailIconBlack";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type ProfilesTableTypes } from "../../types/apiTypes";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { EMAIL_CHECK_PATTERN, USER_PROFILE } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast, successToast } from "../../utils/toastMessages";

type SettingsFormTypes = {
	newEmail: string;
};

const ChangeEmail = () => {
	const [changeEmailLoader, setChangeEmailLoader] = useState(false);

	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const supabase = createClient();

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
					className="absolute left-[-7px] rounded-full bg-gray-0 p-1 hover:bg-gray-100"
					onClick={() => setCurrentSettingsPage("main")}
				>
					<figure className="text-gray-900">
						<BackIconBlack />
					</figure>
				</Button>
				<div className={`${settingsMainHeadingClassName} ml-[21px]`}>
					Change email
				</div>
			</div>
			<div className="border-b border-b-gray-200 pb-[28px]">
				<LabelledComponent
					label="Current email"
					labelClassName={settingsInputLabelClassName}
				>
					<div className={settingsInputContainerClassName}>
						<figure className="mr-2">
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
				className="flex items-end justify-between pt-[28px]"
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
				<div className="flex w-1/2 justify-end max-sm:w-full">
					<Button
						className="flex w-[111px] justify-center bg-gray-300 px-[9px] py-2 text-sm leading-4 hover:bg-gray-700 max-sm:w-full"
						isDisabled={changeEmailLoader}
						onClick={handleSubmit(onSubmit)}
						type="dark"
					>
						{changeEmailLoader ? (
							<Spinner
								className="h-3 w-3 animate-spin"
								style={{ color: "var(--color-plain)" }}
							/>
						) : (
							"Change email"
						)}
					</Button>
				</div>
			</form>
		</>
	);
};

export default ChangeEmail;
