import isNull from 'lodash/isNull';
import { errorToast } from './toastMessages';
import jwt_decode from 'jwt-decode';

// the apiCall param should have mutateAsync
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export const isAccessTokenAuthenticated = (token: string) => {
  const decode = jwt_decode(token) as unknown;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return decode?.aud === 'authenticated';
};
