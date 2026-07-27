import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Camera, Save, ShieldCheck, Sparkles, CheckCircle2, Lock } from "lucide-react";

import { usersApi } from "../../../api/users.api";
import { notify } from "../../../lib/toastHelper";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.me(),
  });

  const [syncedId, setSyncedId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState<string>("");

  if (me && me.id !== syncedId) {
    setSyncedId(me.id);
    setDisplayName(me.displayName ?? "");
    setDescription(me.description ?? "");
  }

  const updateMutation = useMutation({
    mutationFn: (payload: { displayName?: string; description?: string | null }) => usersApi.updateMe(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(["users", "me"], user);
      notify.success("Đã lưu thông tin", "Hồ sơ cá nhân của bạn đã được cập nhật.");
    },
    onError: (err) => {
      notify.error(err, "Không thể cập nhật hồ sơ");
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      notify.loading("Đang tải ảnh đại diện lên Supabase S3...");
      const upload = await usersApi.initAvatarUpload({ fileName: file.name, contentType: file.type });

      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: {
          ...(upload.headers || {}),
        },
        body: file,
      });

      return usersApi.commitAvatarUpload({ objectKey: upload.objectKey });
    },
    onSuccess: (user) => {
      notify.dismiss();
      queryClient.setQueryData(["users", "me"], user);
      notify.success("Đã cập nhật ảnh đại diện", "Ảnh đại diện mới đã được áp dụng.");
    },
    onError: (err) => {
      notify.dismiss();
      notify.error(err, "Không thể tải ảnh đại diện");
    },
  });

  const onSave = () => {
    updateMutation.mutate({
      displayName: displayName.trim() || undefined,
      description: description.trim() ? description.trim() : null,
    });
  };

  const onPickAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify.warning("Tệp quá lớn", "Dung lượng ảnh đại diện không được vượt quá 5MB.");
      return;
    }
    avatarMutation.mutate(file);
    e.currentTarget.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-sm font-medium">Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center border-destructive/20 bg-destructive/5">
          <p className="text-sm font-semibold text-destructive">Không thể tải thông tin hồ sơ cá nhân.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        
        {/* Profile Banner / Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
          <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Avatar with Upload Hover Button */}
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white/30 shadow-2xl">
                {me.avatarUrl ? (
                  <AvatarImage src={me.avatarUrl} alt={me.displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-tr from-indigo-800 to-violet-700 text-2xl font-bold text-white">
                  {getInitials(me.displayName)}
                </AvatarFallback>
              </Avatar>

              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-xs"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="h-7 w-7" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
                disabled={avatarMutation.isPending}
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{me.displayName}</h1>
                <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md px-2.5 py-0.5 border border-white/20">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Thành viên TeamHub
                </Badge>
              </div>

              <p className="text-sm text-white/80 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4" /> {me.email}
              </p>

              <div className="pt-2 text-xs text-white/70 flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Tệp tải lên lưu trữ an toàn trên Supabase S3 Cluster
              </div>
            </div>

            <Button
              onClick={() => document.getElementById("avatar-upload")?.click()}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white rounded-xl shadow-xs"
              disabled={avatarMutation.isPending}
            >
              <Camera className="mr-2 h-4 w-4" />
              {avatarMutation.isPending ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}
            </Button>
          </div>
        </div>

        {/* Profile Main Form */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/80 bg-card/90 shadow-lg backdrop-blur-md rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-500" /> Thông tin cá nhân
                </CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật tên hiển thị và giới thiệu tiểu sử của bạn trên các Board
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="displayName" className="text-xs font-semibold text-foreground">
                    Tên hiển thị (Display Name)
                  </label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground">
                    Địa chỉ Email (Cố định)
                  </label>
                  <Input
                    id="email"
                    value={me.email}
                    disabled
                    className="h-10 rounded-xl bg-muted/50 cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-xs font-semibold text-foreground">
                    Tiểu sử / Ghi chú cá nhân (Bio)
                  </label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả công việc hoặc vai trò của bạn trong tổ chức..."
                    className="rounded-xl resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={onSave}
                    disabled={updateMutation.isPending}
                    className="h-10 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white shadow-md shadow-indigo-500/20"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Details & Security Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/80 bg-card/90 shadow-lg backdrop-blur-md rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-500" /> Bảo mật tài khoản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Tài khoản của bạn được bảo mật bằng mã hóa Bcrypt và JWT Authentication.</span>
                </div>

                <div className="space-y-1 pt-2 border-t border-border">
                  <span className="text-[11px] font-semibold text-foreground">Trạng thái hạ tầng</span>
                  <p className="text-[11px]">Đã đồng bộ Realtime Socket.IO & Redis Queue.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};
