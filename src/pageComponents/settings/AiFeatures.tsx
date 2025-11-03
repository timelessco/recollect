import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useApiKeyMutation } from "../../async/mutationHooks/user/useApiKeyUserMutation";
import useFetchCheckApiKey from "../../async/queryHooks/ai/api-key/useFetchCheckApiKey";
import ButtonComponent from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
} from "../../utils/commonClassNames";
import { AI_PLATFORMS } from "../../utils/constants";
import { errorToast, successToast } from "../../utils/toastMessages";

/* ----------------------------------
 *  TYPES
 * ---------------------------------- */
type AiFeaturesFormTypes = {
	apiKey: string;
};

/* ----------------------------------
 *  SKELETON COMPONENT
 * ---------------------------------- */
const AiFeaturesSkeleton = () => (
	<div className="animate-pulse space-y-6">
		{/* Header Skeleton */}
		<div className="h-6 w-40 rounded bg-gray-200" />
		{/* Input Section Skeleton */}
		<div className="space-y-3">
			<div className="h-3 w-24 rounded bg-gray-200" />
			<div className="h-10 rounded-md bg-gray-100" />
		</div>
		{/* Button Skeleton */}
		<div className="h-10 w-[130px] rounded-lg bg-gray-200" />
	</div>
);

/* ----------------------------------
 *  MAIN COMPONENT
 * ---------------------------------- */
export const AiFeatures = () => {
	const [isReplacing, setIsReplacing] = useState(false);
	const { mutate: saveApiKey, isLoading: isSaving } = useApiKeyMutation();
	const { data, isLoading: isChecking } = useFetchCheckApiKey();

	const hasApiKey = data?.data?.hasApiKey ?? false;

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
	} = useForm<AiFeaturesFormTypes>();

	const handleReplaceClick = () => {
		setIsReplacing(true);
		setValue("apiKey", "");
	};

	/* ----------------------------------
	 *  HANDLERS
	 * ---------------------------------- */
	const onSubmit: SubmitHandler<AiFeaturesFormTypes> = (formData) => {
		saveApiKey(
			{ apikey: formData.apiKey },
			{
				onSuccess: () => {
					successToast("API key saved successfully");
					reset();
				},
				onError: (error) => {
					console.error("Error updating API key:", error);
					errorToast(
						error.message || "Failed to update API key. Please try again.",
					);
				},
			},
		);
	};

	const platform = AI_PLATFORMS[0];

	/* ----------------------------------
	 *  RENDER
	 * ---------------------------------- */
	if (isChecking) {
		return <AiFeaturesSkeleton />;
	}

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			{/* ---------- HEADER ---------- */}
			<div className="relative mb-6 flex items-center">
				<h2 className="text-[18px] font-[600] leading-[115%] tracking-normal text-gray-900">
					AI Features
				</h2>
			</div>
			{/* ---------- API KEY INPUT ---------- */}
			<LabelledComponent
				label={`${platform.name} API Key`}
				labelClassName="text-gray-800 font-[420] text-[14px] leading-[115%] tracking-[2%] mb-2"
			>
				<div className={`${settingsInputContainerClassName} mt-2`}>
					{hasApiKey && !isReplacing ? (
						<div className="flex items-center">
							••••••••••••••••••••••••••••••••
							<button
								className="ml-2 text-sm font-medium text-blue-600 hover:text-blue-800"
								onClick={handleReplaceClick}
								type="button"
							>
								Replace
							</button>
						</div>
					) : (
						<Input
							{...register("apiKey", { required: "API Key is required" })}
							autoFocus={isReplacing}
							className={settingsInputClassName}
							disabled={!isReplacing && hasApiKey}
							errorText={errors.apiKey?.message ?? ""}
							id="api-key"
							isError={Boolean(errors.apiKey)}
							placeholder={`Enter your ${platform.name} API key`}
							type="password"
						/>
					)}
				</div>
			</LabelledComponent>
			{/* ---------- SAVE BUTTON ---------- */}
			<div className="pt-2">
				<ButtonComponent
					className="h-10 w-[130px] rounded-lg px-4 py-2 text-sm font-medium text-plain-color hover:bg-gray-900"
					isDisabled={isSaving || (hasApiKey && !isReplacing)}
					type="dark"
				>
					{isSaving ? (
						<Spinner
							className="h-3 w-3 self-center"
							style={{ color: "var(--color-plain-reverse-color)" }}
						/>
					) : hasApiKey && !isReplacing ? (
						"API Key Saved"
					) : (
						"Save Changes"
					)}
				</ButtonComponent>
			</div>
		</form>
	);
};
