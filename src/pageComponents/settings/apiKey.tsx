import { useState } from "react";
import { Button } from "ariakit";
import { useForm, type SubmitHandler } from "react-hook-form";

import ButtonComponent from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import Spinner from "../../components/spinner";
import BackIconBlack from "../../icons/actionIcons/backIconBlack";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { errorToast, successToast } from "../../utils/toastMessages";

// Using a simple key icon component since the original isn't found
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

type ApiKeyFormTypes = {
	anthropicApiKey: string;
	geminiApiKey: string;
	openaiApiKey: string;
};

const AI_PLATFORMS = [
	{
		id: "gemini",
		name: "Gemini",
		fieldName: "geminiApiKey",
		docsUrl: "https://ai.google.dev/gemini-api/docs/api-key",
		description: "Google's most capable AI model for complex tasks",
	},
	{
		id: "openai",
		name: "OpenAI (GPT-4)",
		fieldName: "openaiApiKey",
		docsUrl: "https://platform.openai.com/docs/quickstart",
		description: "Powerful language model by OpenAI",
	},
	{
		id: "anthropic",
		name: "Anthropic (Claude)",
		fieldName: "anthropicApiKey",
		docsUrl:
			"https://docs.anthropic.com/claude/reference/getting-started-with-the-api",
		description: "AI assistant focused on helpfulness and safety",
	},
] as const;

// Type for AI platform configuration
type _AIPlatform = (typeof AI_PLATFORMS)[number];

export const ApiKey = () => {
	const [isLoading, setIsLoading] = useState(false);
	const session = useSupabaseSession((state) => state.session);
	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ApiKeyFormTypes>();

	const onSubmit: SubmitHandler<ApiKeyFormTypes> = async (_formData) => {
		try {
			setIsLoading(true);
			// TODO: Implement API key update logic for all platforms
			// const updates = await Promise.all(
			//   AI_PLATFORMS.map((platform) =>
			//     updateApiKey(session?.user?.id, platform.id, formData[platform.fieldName])
			//   )
			// );
			successToast("API keys updated successfully");
		} catch (error) {
			console.error("Error updating API keys:", error);
			errorToast("Failed to update API keys. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
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
					Bring your own API Key
				</div>
			</div>
			<div className="space-y-6">
				{AI_PLATFORMS.map((platform) => (
					<div className="mb-6" key={platform.id}>
						<LabelledComponent
							label={platform.name}
							labelClassName={settingsInputLabelClassName}
						>
							<div className="flex items-center gap-2">
								<a
									className="text-xs text-blue-600 hover:underline"
									href={platform.docsUrl}
									rel="noopener noreferrer"
									target="_blank"
								>
									Get API Key
								</a>
							</div>
							<div className="space-y-1">
								<p className="mb-2 text-xs text-gray-500">
									{platform.description}
								</p>
								<div className={settingsInputContainerClassName}>
									<figure className="mr-2">
										<KeyIcon />
									</figure>
									<Input
										{...register(platform.fieldName, {
											required: `${platform.name} API Key is required`,
										})}
										className={settingsInputClassName}
										errorText={errors[platform.fieldName]?.message ?? ""}
										id={`${platform.id}-api-key`}
										isError={Boolean(errors[platform.fieldName])}
										placeholder={`Enter your ${platform.name} API key`}
										type="password"
									/>
								</div>
							</div>
						</LabelledComponent>
					</div>
				))}
				<div className="flex justify-end pt-4">
					<ButtonComponent
						className="h-10 w-[130px] rounded-lg  px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
						isDisabled={isLoading}
						type="dark"
					>
						{isLoading ? <Spinner /> : "Save Changes"}
					</ButtonComponent>
				</div>
			</div>
		</form>
	);
};
