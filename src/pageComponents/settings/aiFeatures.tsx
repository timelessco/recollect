import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useApiKeyMutation } from "../../async/mutationHooks/user/useApiKeyUserMutation";
import { useDeleteApiKeyMutation } from "../../async/mutationHooks/user/useDeleteApiKeyMutation";
import useFetchCheckApiKey from "../../async/queryHooks/ai/api-key/useFetchCheckApiKey";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
// import Switch from "../../components/switch";
// import { EyeIcon } from "../../icons/eyeIcon";
import { InfoIcon } from "../../icons/infoIcon";
import {
	saveButtonClassName,
	settingsInputClassName,
	settingsInputContainerClassName,
	// settingsParagraphClassName,
} from "../../utils/commonClassNames";

/*  TYPES  */
type AiFeaturesFormTypes = {
	apiKey: string;
};

/*  SKELETON COMPONENT  */
const AiFeaturesSkeleton = () => (
	<div className="animate-pulse space-y-6">
		{/* Header Skeleton */}
		<div className="h-6 w-40 rounded-sm bg-gray-200" />
		{/* Input Section Skeleton */}
		<div className="space-y-3">
			<div className="h-3 w-24 rounded-sm bg-gray-200" />
			<div className="h-10 rounded-md bg-gray-100" />
		</div>
		{/* Button Skeleton */}
		<div className="h-10 w-[130px] rounded-lg bg-gray-200" />
	</div>
);

/*  MAIN COMPONENT  */
export const AiFeatures = () => {
	const { mutate: saveApiKey, isLoading: isSaving } = useApiKeyMutation();
	const { mutate: deleteApiKey, isLoading: isDeleting } =
		useDeleteApiKeyMutation();
	const { data, isLoading: isChecking } = useFetchCheckApiKey();

	const hasApiKey = data?.data?.hasApiKey ?? false;

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<AiFeaturesFormTypes>();

	/*  HANDLERS  */
	const onSubmit: SubmitHandler<AiFeaturesFormTypes> = (formData) => {
		saveApiKey({ apikey: formData.apiKey });
		reset();
	};

	/*  RENDER  */
	if (isChecking) {
		return <AiFeaturesSkeleton />;
	}

	const label = hasApiKey ? "Delete" : "Save";

	return (
		<>
			<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
				{/* ---------- HEADER ---------- */}
				<div className="relative mb-6 flex items-center">
					<h2 className="text-[18px] leading-[115%] font-semibold tracking-normal text-gray-900">
						AI Features
					</h2>
				</div>
				{/* ---------- API KEY INPUT ---------- */}
				<LabelledComponent
					label="Gemini API Key"
					labelClassName="text-gray-800 font-[420] text-[14px] leading-[115%] tracking-[0.02em] mb-2"
				>
					<div
						className={`${settingsInputContainerClassName} mt-2 flex items-center justify-between`}
					>
						<Input
							{...register("apiKey", { required: "API Key is required" })}
							autoFocus={isDeleting}
							className={settingsInputClassName}
							errorText=""
							id="api-key"
							isDisabled={hasApiKey ? !isDeleting : false}
							isError={Boolean(errors.apiKey)}
							placeholder={
								isSaving
									? "••••••••••••••••••••••••••••••••"
									: hasApiKey
										? "••••••••••••••••••••••••••••••••"
										: "Enter your API key"
							}
							showError={false}
							type="password"
						/>
						<Button
							className={`relative my-[3px] ${saveButtonClassName} px-2 py-[4.5px]`}
							onClick={() => {
								if (hasApiKey && !isDeleting) {
									deleteApiKey();
									reset();
								} else {
									void handleSubmit(onSubmit)();
								}
							}}
						>
							<span
								className={`transition-opacity duration-150 ${
									isSaving ? "opacity-0" : "opacity-100"
								}`}
							>
								{label}
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
					<p className="text-13 mt-2 flex flex-wrap items-center leading-[150%] tracking-normal text-gray-600">
						<figure className="mr-2 shrink-0">
							<InfoIcon />
						</figure>
						<span className="flex flex-wrap items-center">
							Add your API key to enable AI features, get a free key from{" "}
							<a
								className="relative ml-1 inline-flex items-center underline"
								href="https://makersuite.google.com/app/apikey"
								rel="noopener noreferrer"
								target="_blank"
							>
								Google AI
							</a>
						</span>
					</p>
				</LabelledComponent>
			</form>
			{/* <div className="pt-10">
				<p className="pb-2.5 text-[14px] font-medium leading-[115%] tracking-normal text-gray-900">
					Features
				</p>
				<div className="flex items-center justify-between rounded-lg bg-gray-100">
					<div className="max-sm:flex max-sm:w-full max-sm:items-center max-sm:justify-between">
 							<EyeIcon />
							<p
								className={`my-2 ml-2 text-gray-900  ${settingsParagraphClassName}`}
							>
								Auto generate image descriptions
								<p className="mt-1 text-[14px] font-normal leading-[115%] text-gray-600">
									So you can search all your memes by text
								</p>
							</p>
 					</div>
					<div className="mr-[10px]">
						<Switch
							disabled
							enabled={false}
							setEnabled={() => {}}
							size="medium"
						/>
					</div>
				</div>
			</div> */}
		</>
	);
};
