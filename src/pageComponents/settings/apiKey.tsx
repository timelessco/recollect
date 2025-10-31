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
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { errorToast, successToast } from "../../utils/toastMessages";

/* ----------------------------------
 *  SVG ICONS
 * ---------------------------------- */
const KeyIcon = () => (
	<svg
		fill="none"
		height="20"
		stroke="currentColor"
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeWidth="2"
		viewBox="0 0 24 24"
		width="20"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
	</svg>
);

/* ----------------------------------
 *  CONSTANTS
 * ---------------------------------- */
const AI_PLATFORMS = [
	{
		id: "gemini",
		name: "Gemini",
		docsUrl: "https://ai.google.dev/gemini-api/docs/api-key",
		description: "Google's most capable AI model for complex tasks",
	},
] as const;

/* ----------------------------------
 *  TYPES
 * ---------------------------------- */
type ApiKeyFormTypes = {
	apiKey: string;
};

/* ----------------------------------
 *  MAIN COMPONENT
 * ---------------------------------- */
export const ApiKey = () => {
	const [isReplacing, setIsReplacing] = useState(false);
	const { mutate: saveApiKey, isLoading: isSaving } = useApiKeyMutation();
	const { data } = useFetchCheckApiKey();
	const hasApiKey = data?.data?.hasApiKey;
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
					onClick={handleSubmit(onSubmit)}
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
