import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";

import { useFetchCheckApiKey } from "@/async/queryHooks/ai/api-key/use-fetch-check-gemini-api-key";
import { ShowEyeIcon } from "@/icons/show-eye-icon";
import { SlashedEyeIcon } from "@/icons/slashed-eye-icon";
import { handleClientError } from "@/utils/error-utils/client";

import { useApiKeyMutation } from "../../async/mutationHooks/user/use-api-key-user-mutation";
import { useDeleteApiKeyMutation } from "../../async/mutationHooks/user/use-delete-api-key-mutation";
import useFetchGetApiKey from "../../async/queryHooks/ai/api-key/use-fetch-get-gemini-api-key";
import Button from "../../components/atoms/button";
import Input from "../../components/atoms/input";
import LabelledComponent from "../../components/labelledComponent";
import { Spinner } from "../../components/spinner";
import { useIsMobileView } from "../../hooks/useIsMobileView";
import { InfoIcon } from "../../icons/info-icon";
import {
  saveButtonClassName,
  settingsInputClassName,
  settingsInputContainerClassName,
} from "../../utils/commonClassNames";
import { AiFeaturesToggleSection } from "./ai-features-toggles";

interface AiFeaturesFormTypes {
  apiKey: string;
}

const ToggleCardSkeleton = () => (
  <div className="flex items-center justify-between rounded-xl bg-gray-100 py-2">
    <div className="ml-2 flex items-center gap-2">
      <div className="size-[38px] rounded-md bg-gray-200" />
      <div>
        <div className="h-3 w-32 rounded-sm bg-gray-200" />
        <div className="mt-2 h-3 w-48 rounded-sm bg-gray-200" />
      </div>
    </div>
    <div className="mr-[10px] h-5 w-9 rounded-full bg-gray-200" />
  </div>
);

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

    <div className="animate-pulse pt-10">
      <div className="pb-[10px]">
        <div className="h-3 w-16 rounded-sm bg-gray-200" />
      </div>
      <div className="space-y-2">
        <ToggleCardSkeleton />
        <ToggleCardSkeleton />
        <ToggleCardSkeleton />
        <ToggleCardSkeleton />
      </div>
    </div>
  </div>
);

export const AiFeatures = () => {
  const [apiKey, setApiKey] = useState<null | string>(null);
  const [showKey, setShowKey] = useState(false);
  const { isMobile } = useIsMobileView();
  const { isPending: isSaving, mutate: saveApiKey } = useApiKeyMutation();
  const { isPending: isDeleting, mutate: deleteApiKey } = useDeleteApiKeyMutation();
  const { refetch: fetchApiKey } = useFetchGetApiKey();

  const handleEyeClick = async () => {
    try {
      if (showKey) {
        setShowKey(false);
        return;
      }

      const { data } = await fetchApiKey({ throwOnError: true });
      if (!data) {
        return;
      }

      setApiKey(data.apiKey);
      setShowKey(true);
    } catch (error) {
      handleClientError(error, "Failed to fetch API key");
    }
  };

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<AiFeaturesFormTypes>();

  const { data, isLoading: isChecking } = useFetchCheckApiKey();

  if (isChecking || !data) {
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

  const { hasApiKey } = data;

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
                control={control}
                name="apiKey"
                render={({ field }) => {
                  const rhfValue = field.value;

                  let displayValue: string;
                  if (hasApiKey && !isDeleting) {
                    if (showKey) {
                      displayValue = apiKey ?? "";
                    } else {
                      displayValue = isMobile
                        ? "••••••••••••••••"
                        : "••••••••••••••••••••••••••••••••";
                    }
                  } else {
                    displayValue = rhfValue;
                  }

                  return (
                    <Input
                      {...field}
                      className={`${settingsInputClassName} leading-[115%]`}
                      errorText=""
                      id="api-key"
                      isDisabled={hasApiKey ? !isDeleting : false}
                      isError={Boolean(errors.apiKey)}
                      placeholder="Enter your API key"
                      showError={false}
                      type={hasApiKey && !showKey ? "password" : "text"}
                      value={displayValue}
                    />
                  );
                }}
                rules={hasApiKey ? {} : { required: "API Key is required" }}
              />

              {hasApiKey && (
                <button
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-xl leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={() => {
                    void handleEyeClick();
                  }}
                  type="button"
                >
                  {showKey ? <ShowEyeIcon /> : <SlashedEyeIcon />}
                </button>
              )}
            </div>

            <Button
              buttonType="submit"
              className={`relative my-[3px] ${saveButtonClassName} rounded-[5px] px-2 py-[4.5px]`}
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

          <div className="mt-2 flex items-center gap-2 text-13 leading-[150%] text-gray-600">
            <InfoIcon className="h-4.5 w-4.5 shrink-0 text-gray-600" />
            <span>
              Add your API key to remove AI limits, get a free key from{" "}
              <a
                className="underline"
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
      <AiFeaturesToggleSection />
    </>
  );
};
