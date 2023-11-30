import isNull from "lodash/isNull";

import { errorToast } from "./toastMessages";

// This file has front end api related helpers

// NOTE: We are disabling lint in this file as we are not sure for a unified response for api calls

// the apiCall param should have mutateAsync
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mutationApiCall = async (apiCall: Promise<any>) => {
	const response = await apiCall;

	if (!isNull(response?.error)) {
		errorToast(response?.error?.message);
	}

	if (!isNull(response?.data?.message)) {
		errorToast(response?.data?.message);
	}

	if (response?.response?.data?.error?.message) {
		errorToast(response?.response?.data?.error?.message);
	}

	if (response?.response?.status !== 200 && response?.response?.data?.error) {
		errorToast(response?.response?.data?.error);
	}

	return response;
};
