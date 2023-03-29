/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import isNull from "lodash/isNull";

import { errorToast } from "./toastMessages";

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

	return response;
};

// tells if token is authenticated or not
// export const isAccessTokenAuthenticated = (token: string) => {
//   const decode = jwt_decode(token) as unknown;

//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   //@ts-ignore
//   return decode?.aud === 'authenticated';
// };
