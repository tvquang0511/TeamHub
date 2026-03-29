import axios from "axios";

export type ApiErrorInfo = {
  status?: number;
  code?: string;
  message?: string;
};

export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (!axios.isAxiosError(error)) return {};

  const status = error.response?.status;
  const apiError = (error.response?.data as any)?.error;
  const code = apiError?.code;
  const message = apiError?.message || error.message;

  return { status, code, message };
}

export function getToastErrorMessage(error: unknown, fallback: string): string {
  const info = getApiErrorInfo(error);

  if (info.status === 403) {
    return "Bạn không đủ quyền để thực hiện thao tác này";
  }

  if (info.message) {
    return info.code ? `${info.message} (${info.code})` : info.message;
  }

  return fallback;
}
