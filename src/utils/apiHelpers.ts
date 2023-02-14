/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import isNull from "lodash/isNull";

import { errorToast } from "./toastMessages";

// NOTE: We are disabling lint in this file as we are not sure for a unified res for api calls

// the apiCall param should have mutateAsync
export const mutationApiCall = async (apiCall: Promise<any>) => {
  const res = await apiCall;

  if (!isNull(res?.error)) {
    errorToast(res?.error?.message);
  }

  if (!isNull(res?.data?.message)) {
    errorToast(res?.data?.message);
  }

  if (res?.response?.data?.error?.message) {
    errorToast(res?.response?.data?.error?.message);
  }

  return res;
};

// tells if token is authenticated or not
// export const isAccessTokenAuthenticated = (token: string) => {
//   const decode = jwt_decode(token) as unknown;

//   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   //@ts-ignore
//   return decode?.aud === 'authenticated';
// };
