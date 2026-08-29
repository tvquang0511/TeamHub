import axios from "axios";

export type ApiErrorInfo = {
  status?: number;
  code?: string;
  message?: string;
  details?: any;
};

export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  if (!axios.isAxiosError(error)) return {};

  const status = error.response?.status;
  const apiError = (error.response?.data as any)?.error;
  const code = apiError?.code;
  const message = apiError?.message || error.message;
  const details = apiError?.details;

  return { status, code, message, details };
}

export function getToastErrorMessage(error: unknown, fallback: string): string {
  const info = getApiErrorInfo(error);

  if (info.code === "AUTH_EMAIL_NOT_VERIFIED") {
    return "Tài khoản chưa được xác thực. Vui lòng xác thực email trước khi đăng nhập.";
  }

  if (info.status === 401) {
    return "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.";
  }

  if (info.status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  if (info.status === 404) {
    return info.message || "Dữ liệu hoặc trang yêu cầu không tồn tại.";
  }

  if (info.status === 409) {
    return info.message || "Dữ liệu bị trùng lặp hoặc xung đột hệ thống.";
  }

  if (info.status === 422) {
    if (Array.isArray(info.details) && info.details.length > 0) {
      const firstIssue = info.details[0]?.message || info.details[0];
      return `Dữ liệu không hợp lệ: ${firstIssue}`;
    }
    return info.message || "Dữ liệu nhập vào chưa đúng định dạng.";
  }

  if (info.status === 429) {
    return "Hệ thống đang quá tải, vui lòng thử lại sau vài giây.";
  }

  if (info.status && info.status >= 500) {
    return "Hệ thống máy chủ gặp sự cố. Đội ngũ kỹ thuật đã ghi nhận.";
  }

  if (info.message) {
    return info.code ? `${info.message} (${info.code})` : info.message;
  }

  return fallback;
}
