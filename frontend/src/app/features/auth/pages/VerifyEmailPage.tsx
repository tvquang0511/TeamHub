import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { AuthLayout } from "../components/AuthLayout";
import { authApi } from "../../../api/auth.api";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Không tìm thấy mã xác thực. Đường dẫn không hợp lệ."
  );
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const verify = async () => {
      try {
        await authApi.verifyEmail({ token });
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(
          err.response?.data?.message || "Xác thực thất bại. Mã xác thực có thể đã hết hạn hoặc không hợp lệ."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <AuthLayout
      title="Xác thực Email"
      subtitle="Quá trình xác thực sẽ hoàn tất trong giây lát"
      bannerTitle="Bảo mật cấp doanh nghiệp"
      bannerSubtitle="Xác thực email giúp bảo vệ tài khoản của bạn khỏi rủi ro bảo mật."
      bannerCtaText="Về trang đăng nhập"
      bannerCtaLink="/login"
    >
      <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Đang xác thực...</h3>
              <p className="text-sm text-muted-foreground">Vui lòng đợi trong giây lát</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Xác thực thành công!</h3>
              <p className="text-sm text-muted-foreground">Tài khoản của bạn đã được xác thực thành công.</p>
            </div>
            <Button asChild className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl">
              <Link to="/login">Đến trang Đăng nhập</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Xác thực thất bại</h3>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button asChild variant="outline" className="w-full mt-4 h-11 rounded-xl">
              <Link to="/login">Về trang Đăng nhập</Link>
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
};