import { toast } from 'react-toastify';

export const errorToast = (err: string) => toast.error(err);

export const successToast = (message: string) => toast.success(message);
