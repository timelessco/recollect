import isNull from "lodash/isNull";

import { errorToast } from "./toastMessages";

// This file has front end api related helpers

const defaultErrorText = "Something went wrong";

const errorTextLogic = (error: unknown) =>
	typeof error === "string" ? error : defaultErrorText;

// the apiCall param should have mutateAsync
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mutationApiCall = async (apiCall: Promise<any>) => {
	const response = await apiCall;

	if (!isNull(response?.error)) {
		errorToast(errorTextLogic(response?.error?.message));
	}

	if (!isNull(response?.data?.message)) {
		errorToast(errorTextLogic(response?.data?.message));
	}

	if (response?.response?.data?.error?.message) {
		errorToast(errorTextLogic(response?.response?.data?.error?.message));
	}

	if (response?.response?.status !== 200 && response?.response?.data?.error) {
		errorToast(errorTextLogic(response?.response?.data?.error));
	}

	return response;
};
