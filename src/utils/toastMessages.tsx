import { toast } from "react-toastify";

export const errorToast = (error: string) => toast.error(error);

export const successToast = (message: string) => toast.success(message);
