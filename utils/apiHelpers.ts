import isNull from 'lodash/isNull';
import { errorToast } from './toastMessages';


// the apiCall param should have mutateAsync
export const mutationApiCall = async (apiCall: Promise<any>) => {
  const res = await apiCall;


  if (!isNull(res?.error)) {
    errorToast(res?.error?.message);
  }
}