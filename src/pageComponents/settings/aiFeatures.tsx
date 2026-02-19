import { useState } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";

import { useApiKeyMutation } from "../../async/mutationHooks/user/useApiKeyUserMutation";
import { useDeleteApiKeyMutation } from "../../async/mutationHooks/user/useDeleteApiKeyMutation";
import useUpdateUserProfileOptimisticMutation from "../../async/mutationHooks/user/useUpdateUserProfileOptimisticMutation";
import { useFetchCheckApiKey } from "../../async/queryHooks/ai/api-key/useFetchCheckGeminiApiKey";
import useFetchGetApiKey from "../../async/queryHooks/ai/api-key/useFetchGetGeminiApiKey";
import useFetchUserProfile from "../../async/queryHooks/user/useFetchUserProfile";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { InfoIcon } from "../../icons/info-icon";
import {
	saveButtonClassName,
	settingsInputClassName,
	settingsInputContainerClassName,
} from "../../utils/commonClassNames";

import { SettingsToggleCard } from "./settingsToggleCard";
import { AutoAssignCollectionIcon } from "@/icons/auto-assign-collection-icon";
import { ShowEyeIcon } from "@/icons/show-eye-icon";
import { SlashedEyeIcon } from "@/icons/slashed-eye-icon";
import { handleClientError } from "@/utils/error-utils/client";

type AiFeaturesFormTypes = {
	apiKey: string;
};

const AiFeaturesSkeleton = () => (
	<div className="space-y-6">
		<div className="relative mb-6 flex items-center">
			<h2 className="text-[18px] leading-[115%] font-semibold tracking-normal text-gray-900">
				AI Features
			</h2>
		</div>

		<div className="animate-pulse">
			<div className="mb-2 h-3 w-24 rounded-sm bg-gray-200" />
			<div className="h-10 rounded-md bg-gray-100" />
		</div>
	</div>
);

export const AiFeatures = () => {
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [showKey, setShowKey] = useState(false);
	const { mutate: saveApiKey, isPending: isSaving } = useApiKeyMutation();
	const { mutate: deleteApiKey, isPending: isDeleting } =
		useDeleteApiKeyMutation();
	const { refetch: fetchApiKey } = useFetchGetApiKey();

	const handleEyeClick = async () => {
		try {
			if (showKey) {
				setShowKey(false);
				return;
			}

			const { data } = await fetchApiKey();
			if (!data?.data) {
				return;
			}

			setApiKey(data.data.apiKey);
			setShowKey(true);
		} catch (error) {
			handleClientError(error, "Failed to fetch API key");
		}
	};

	const {
		handleSubmit,
		formState: { errors },
		reset,
		control,
	} = useForm<AiFeaturesFormTypes>();

	const { data, isLoading: isChecking } = useFetchCheckApiKey();

	if (isChecking || !data?.data) {
		return <AiFeaturesSkeleton />;
	}

	const onSubmit: SubmitHandler<AiFeaturesFormTypes> = (formData) => {
		if (hasApiKey) {
			deleteApiKey();
			reset({ apiKey: "" });
			setApiKey(null);
			setShowKey(false);
			return;
		}

		saveApiKey({ apikey: formData.apiKey });
	};

	const hasApiKey = data.data.hasApiKey;

	return (
		<>
			<form
				className="space-y-6"
				onSubmit={(event) => {
					event.preventDefault();
					void handleSubmit(onSubmit)();
				}}
			>
				<div className="relative mb-6 flex items-center">
					<h2 className="text-[18px] leading-[115%] font-semibold tracking-normal text-gray-900">
						AI Features
					</h2>
				</div>

				<LabelledComponent
					label="Gemini API Key"
					labelClassName="text-gray-800 font-[420] text-[14px] leading-[115%] tracking-[0.02em] mb-2"
				>
					<div
						className={`${settingsInputContainerClassName} mt-2 flex items-center justify-between`}
					>
						<div className="relative w-full">
							<Controller
								name="apiKey"
								control={control}
								rules={{
									...(hasApiKey ? {} : { required: "API Key is required" }),
								}}
								render={({ field }) => {
									const rhfValue = field.value;

									const displayValue =
										hasApiKey && !isDeleting
											? showKey
												? apiKey || ""
												: "••••••••••••••••••••••••••••••••"
											: rhfValue;

									return (
										<Input
											{...field}
											className={`${settingsInputClassName} leading-[115%]`}
											errorText=""
											id="api-key"
											isDisabled={hasApiKey ? !isDeleting : false}
											isError={Boolean(errors.apiKey)}
											value={displayValue}
											placeholder="Enter your API key"
											showError={false}
											type={hasApiKey && !showKey ? "password" : "text"}
										/>
									);
								}}
							/>

							{hasApiKey && (
								<button
									type="button"
									onClick={handleEyeClick}
									className="absolute top-1/2 right-2 -translate-y-1/2 text-xl leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
									aria-label={showKey ? "Hide API key" : "Show API key"}
								>
									{showKey ? <ShowEyeIcon /> : <SlashedEyeIcon />}
								</button>
							)}
						</div>

						<Button
							className={`relative my-[3px] ${saveButtonClassName} rounded-[5px] px-2 py-[4.5px]`}
							buttonType="submit"
						>
							<span
								className={`transition-opacity duration-150 ${
									isSaving ? "opacity-0" : "opacity-100"
								}`}
							>
								{hasApiKey ? "Delete" : "Save"}
							</span>

							{isSaving ? (
								<span className="absolute inset-0 flex items-center justify-center">
									<Spinner className="h-3 w-3" />
								</span>
							) : null}
						</Button>
					</div>

					{errors.apiKey && (
						<div className="pointer-events-none flex items-center pr-3">
							<p className="mt-1 text-xs text-red-600">
								{errors.apiKey.message}
							</p>
						</div>
					)}

					<div className="mt-2 flex flex-wrap items-center text-13 leading-[150%] tracking-normal text-gray-600">
						<figure className="mr-2 shrink-0">
							<InfoIcon className="my-0.5 h-4.5 w-4.5 text-gray-600" />
						</figure>
						<span className="flex flex-wrap items-center space-x-1">
							<span>
								Add your API key to remove AI limits, get a free key from
							</span>
							<a
								className="relative inline-flex items-center underline"
								href="https://makersuite.google.com/app/apikey"
								rel="noopener noreferrer"
								target="_blank"
							>
								Google AI
							</a>
						</span>
					</div>
				</LabelledComponent>
			</form>
			<AutoAssignCollectionsToggle />
		</>
	);
};

const AutoAssignCollectionsToggle = () => {
	const { userProfileData, isLoading } = useFetchUserProfile();
	const { updateUserProfileOptimisticMutation } =
		useUpdateUserProfileOptimisticMutation();

	const userData = userProfileData?.data?.[0];
	const enabled = userData?.auto_assign_collections ?? true;

	return (
		<div className="pt-10">
			<p className="pb-[10px] text-[14px] leading-[115%] font-medium text-gray-900">
				Features
			</p>
			<SettingsToggleCard
				icon={
					<figure className="text-gray-900">
						<AutoAssignCollectionIcon className="h-5.5 w-5.5" />
					</figure>
				}
				title="Auto assign a collection to bookmarks"
				description="Automatically assign bookmarks to collections"
				isSwitch
				enabled={isLoading ? false : enabled}
				onToggle={
					isLoading
						? undefined
						: () => {
								updateUserProfileOptimisticMutation.mutate({
									updateData: { auto_assign_collections: !enabled },
								});
							}
				}
			/>
		</div>
	);
};
