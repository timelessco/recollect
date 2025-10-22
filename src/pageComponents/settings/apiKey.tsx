import { useState } from "react";
import * as Ariakit from "@ariakit/react";
import { useForm, type SubmitHandler } from "react-hook-form";

import ButtonComponent from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import Spinner from "../../components/spinner";
import BackIconBlack from "../../icons/actionIcons/backIconBlack";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	settingsInputClassName,
	settingsInputContainerClassName,
	settingsInputLabelClassName,
	settingsMainHeadingClassName,
} from "../../utils/commonClassNames";
import { errorToast, successToast } from "../../utils/toastMessages";

/* ---------------------------- Key Icon Component --------------------------- */
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

/* ---------------------------- Platform Constants --------------------------- */
const AI_PLATFORMS = [
	{
		id: "gemini",
		name: "Gemini",
		docsUrl: "https://ai.google.dev/gemini-api/docs/api-key",
		description: "Google's most capable AI model for complex tasks",
	},
	{
		id: "openai",
		name: "OpenAI (GPT-4)",
		docsUrl: "https://platform.openai.com/docs/quickstart",
		description: "Powerful language model by OpenAI",
	},
	{
		id: "anthropic",
		name: "Anthropic (Claude)",
		docsUrl:
			"https://docs.anthropic.com/claude/reference/getting-started-with-the-api",
		description: "AI assistant focused on helpfulness and safety",
	},
] as const;

type ApiKeyFormTypes = {
	apiKey: string;
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export const ApiKey = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [selectedPlatform, setSelectedPlatform] = useState<
		(typeof AI_PLATFORMS)[number] | null
	>(AI_PLATFORMS[0]);

	const setCurrentSettingsPage = useMiscellaneousStore(
		(state) => state.setCurrentSettingsPage,
	);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ApiKeyFormTypes>();

	const onSubmit: SubmitHandler<ApiKeyFormTypes> = async () => {
		try {
			setIsLoading(true);
			successToast(
				`${selectedPlatform?.name ?? "AI Platform"} API key saved successfully`,
			);
			reset();
		} catch (error) {
			console.error("Error updating API key:", error);
			errorToast("Failed to update API key. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			{/* Header */}
			<div className="relative mb-[30px] flex items-center">
				<Ariakit.Button
					className="absolute left-[-7px] rounded-full p-1"
					onClick={() => setCurrentSettingsPage("main")}
				>
					<figure>
						<BackIconBlack />
					</figure>
				</Ariakit.Button>
				<div className={`${settingsMainHeadingClassName} ml-[21px]`}>
					Bring your own API Key
				</div>
			</div>
			{/* Platform Selector */}
			{/* Platform Selector */}
			<LabelledComponent
				label="AI Platform"
				labelClassName={settingsInputLabelClassName}
			>
				<div className="flex flex-col">
					<a
						className="text-xs text-blue-600 hover:underline"
						href={selectedPlatform?.docsUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Get API Key
					</a>
					{/* Clean Ariakit Select (no search) */}
					<Ariakit.SelectProvider
						setValue={(value) => {
							const match = AI_PLATFORMS.find(
								(platform) => platform.name === value,
							);
							if (match) setSelectedPlatform(match);
						}}
						value={selectedPlatform?.name ?? ""}
					>
						<div className="relative mt-2 w-[200px]">
							<Ariakit.Select className="flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 hover:border-gray-400">
								<span>{selectedPlatform?.name ?? "Select Platform"}</span>
								<svg
									className="ml-2 h-4 w-4 text-gray-500"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path
										d="M6 9l6 6 6-6"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</Ariakit.Select>
							<Ariakit.SelectPopover
								className="z-50 mt-1 max-h-[250px] w-[200px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-md"
								modal={false}
							>
								{AI_PLATFORMS.map((platform) => (
									<Ariakit.SelectItem
										className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100 aria-selected:bg-gray-100 ${
											selectedPlatform?.id === platform.id
												? "bg-gray-50 font-medium"
												: ""
										}`}
										key={platform.id}
										onClick={() => setSelectedPlatform(platform)}
										value={platform.name}
									>
										<span>{platform.name}</span>
										{selectedPlatform?.id === platform.id && (
											<svg
												className="h-4 w-4 text-gray-600"
												fill="none"
												stroke="currentColor"
												strokeWidth={2}
												viewBox="0 0 24 24"
											>
												<path
													d="M5 13l4 4L19 7"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										)}
									</Ariakit.SelectItem>
								))}
							</Ariakit.SelectPopover>
						</div>
					</Ariakit.SelectProvider>
					<p className="mt-2 text-xs text-gray-500">
						{selectedPlatform?.description}
					</p>
				</div>
			</LabelledComponent>
			{/* API Key Input */}
			<LabelledComponent
				label={`${selectedPlatform?.name ?? "AI Platform"} API Key`}
				labelClassName={`${settingsInputLabelClassName} mt-6`}
			>
				<div className={`${settingsInputContainerClassName} mt-2`}>
					<figure className="mr-2">
						<KeyIcon />
					</figure>
					<Input
						{...register("apiKey", {
							required: "API Key is required",
						})}
						className={settingsInputClassName}
						errorText={errors.apiKey?.message ?? ""}
						id="api-key"
						isError={Boolean(errors.apiKey)}
						placeholder={`Enter your ${selectedPlatform?.name} API key`}
						type="password"
					/>
				</div>
			</LabelledComponent>
			{/* Save Button */}
			<div className="flex justify-start pt-6">
				<ButtonComponent
					className="h-10 w-[130px] rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
					isDisabled={isLoading}
					type="dark"
				>
					{isLoading ? <Spinner /> : "Save Changes"}
				</ButtonComponent>
			</div>
		</form>
	);
};
