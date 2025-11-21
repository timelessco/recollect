import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useApiKeyMutation } from "../../async/mutationHooks/user/useApiKeyUserMutation";
import { useDeleteApiKeyMutation } from "../../async/mutationHooks/user/useDeleteApiKeyMutation";
import { useFetchCheckApiKey } from "../../async/queryHooks/ai/api-key/useFetchCheckGeminiApiKey";
import useFetchGetApiKey from "../../async/queryHooks/ai/api-key/useFetchGetGeminiApiKey";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { InfoIcon } from "../../icons/infoIcon";
import {
	saveButtonClassName,
	settingsInputClassName,
	settingsInputContainerClassName,
} from "../../utils/commonClassNames";

import { ShowEyeIcon } from "@/icons/show-eye-icon";
import { EyeIconSlashed } from "@/icons/slashed-eye-icon";
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
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<AiFeaturesFormTypes>();

	const { data, isLoading: isChecking } = useFetchCheckApiKey();

	if (isChecking || !data?.data) {
		return <AiFeaturesSkeleton />;
	}

	const onSubmit: SubmitHandler<AiFeaturesFormTypes> = (formData) => {
		saveApiKey({ apikey: formData.apiKey });
		reset();
	};

	const hasApiKey = data.data.hasApiKey;

	return (
		<form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
						<Input
							{...register("apiKey", { required: "API Key is required" })}
							autoFocus={isDeleting}
							className={`${settingsInputClassName} leading-[115%]`}
							errorText=""
							id="api-key"
							isDisabled={hasApiKey ? !isDeleting : false}
							isError={Boolean(errors.apiKey)}
							value={
								hasApiKey && !isDeleting
									? showKey
										? apiKey || ""
										: "••••••••••••••••••••••••••••••••"
									: ""
							}
							placeholder={
								isSaving
									? "••••••••••••••••••••••••••••••••"
									: "Enter your API key"
							}
							showError={false}
							type={showKey ? "text" : "password"}
						/>
						{hasApiKey && (
							<button
								type="button"
								onClick={handleEyeClick}
								className="absolute top-1/2 right-2 -translate-y-1/2 text-xl leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
								aria-label={showKey ? "Hide API key" : "Show API key"}
							>
								{showKey ? <ShowEyeIcon /> : <EyeIconSlashed />}
							</button>
						)}
					</div>

					<Button
						className={`relative my-[3px] ${saveButtonClassName} px-2 py-[4.5px]`}
						onClick={() => {
							if (hasApiKey && !isDeleting) {
								deleteApiKey();
								reset({ apiKey: "" });
								setApiKey(null);
								setShowKey(false);
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
						<p className="mt-1 text-xs text-red-600">{errors.apiKey.message}</p>
					</div>
				)}

				<p className="mt-2 flex flex-wrap items-center text-13 leading-[150%] tracking-normal text-gray-600">
					<figure className="mr-2 shrink-0">
						<InfoIcon />
					</figure>
					<span className="flex flex-wrap items-center space-x-1">
						<span>
							Add your API key to enable AI features, get a free key from
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
				</p>
			</LabelledComponent>
		</form>
	);
};
