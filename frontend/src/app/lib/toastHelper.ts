import { toast } from "sonner";
import { getToastErrorMessage } from "./apiError";

export const notify = {
  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      duration: 3500,
    });
  },

  error: (error: unknown, defaultMessage: string, description?: string) => {
    const formattedMessage = getToastErrorMessage(error, defaultMessage);
    toast.error(formattedMessage, {
      description,
      duration: 5000,
    });
  },

  warning: (title: string, description?: string) => {
    toast.warning(title, {
      description,
      duration: 4000,
    });
  },

  info: (title: string, description?: string) => {
    toast.info(title, {
      description,
      duration: 3500,
    });
  },

  loading: (title: string) => {
    return toast.loading(title);
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => {
    return toast.promise(promise, msgs);
  },
};
