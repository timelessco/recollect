import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useApiKeyMutation } from "../../async/mutationHooks/user/useApiKeyUserMutation";
import useFetchCheckApiKey from "../../async/queryHooks/ai/api-key/useFetchCheckApiKey";
import ButtonComponent from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { KeyIcon } from "../../icons/keyIcon";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { AI_PLATFORMS } from "../../utils/constants";
import { errorToast, successToast } from "../../utils/toastMessages";

/* ----------------------------------
 *  TYPES
 * ---------------------------------- */
type ApiKeyFormTypes = {
	apiKey: string;
};

/* ----------------------------------
 *  SKELETON COMPONENT
 * ---------------------------------- */
const ApiKeySkeleton = () => (
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
export const ApiKey = () => {
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
	} = useForm<ApiKeyFormTypes>();

	const handleReplaceClick = () => {
		setIsReplacing(true);
		setValue("apiKey", "");
	};

	/* ----------------------------------
	 *  HANDLERS
	 * ---------------------------------- */
	const onSubmit: SubmitHandler<ApiKeyFormTypes> = (formData) => {
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
		return <ApiKeySkeleton />;
	}

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
			{/* ---------- HEADER ---------- */}
			<div className="relative mb-6 flex items-center">
				<h2 className={`${settingsMainHeadingClassName}`}>
					Bring Your Own API Key
				</h2>
			</div>
			{/* ---------- API KEY INPUT ---------- */}
			<LabelledComponent
				label={`${platform.name} API Key`}
				labelClassName={`${settingsInputLabelClassName} mt-4`}
			>
				{/* ---------- PLATFORM INFO ---------- */}
				<section className="flex flex-col">
					<a
						className="text-xs text-[#007bf4e5] hover:underline"
						href={platform.docsUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Get API Key
					</a>
					<p className="mt-2 text-xs text-gray-500">{platform.description}</p>
				</section>
				<div className={`${settingsInputContainerClassName} mt-2`}>
					<figure className="mr-2 text-gray-1000">
						<KeyIcon />
					</figure>
					{hasApiKey && !isReplacing ? (
						<div className="flex items-center">
							<div className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
								••••••••••••••••••••••••••••••••
							</div>
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
