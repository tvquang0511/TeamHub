import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { usersApi } from "../../../api/users.api";
import { workspacesApi } from "../../../api/workspaces.api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Search, UserPlus, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { User, WorkspaceMember } from "../../../types/api";
import { ConfirmWithRoleDialog, type Role3 } from "../../../components/shared/ConfirmWithRoleDialog";
import { getToastErrorMessage } from "../../../lib/apiError";

type Props = {
  workspaceId: string;
  existingMembers?: WorkspaceMember[];
  canManage: boolean;
};

export const AddWorkspaceMemberCard: React.FC<Props> = ({
  workspaceId,
  existingMembers,
  canManage,
}) => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selected, setSelected] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const existingUserIds = useMemo(() => {
    return new Set((existingMembers || []).map((m) => m.userId));
  }, [existingMembers]);

  const addMemberMutation = useMutation({
    mutationFn: (input: { email: string; role: "ADMIN" | "MEMBER" }) =>
      workspacesApi.addMemberByEmail(workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "members"] });
      toast.success("Đã thêm thành viên mới vào workspace thành công!");
      setConfirmOpen(false);
      setSelected(null);
      setSearchQuery("");
      setResults([]);
    },
    onError: (error: any) => {
      toast.error(getToastErrorMessage(error, "Không thể thêm thành viên"));
    },
  });

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await usersApi.search(searchQuery, { limit: 8 });
        setResults(users);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, workspaceId]);

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const openConfirm = (u: User) => {
    if (!canManage) {
      toast.error("Bạn không đủ quyền để thêm thành viên vào workspace");
      return;
    }
    setSelected(u);
    setConfirmOpen(true);
  };

  const handleConfirm = (role: Role3) => {
    if (!selected) return;

    if (role === "OWNER") {
      return;
    }

    addMemberMutation.mutate({ email: selected.email, role: role as "ADMIN" | "MEMBER" });
  };

  return (
    <>
      <Card className="overflow-hidden border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-md">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Thêm thành viên mới</CardTitle>
              <CardDescription className="text-xs">
                Tìm kiếm người dùng theo tên hoặc email để mời tham gia làm việc chung
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {!canManage ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              Chỉ Owner hoặc Admin của Workspace mới có quyền thêm thành viên mới.
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Tìm kiếm thành viên</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nhập tên hoặc địa chỉ email để tìm nhanh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/80 focus:ring-2 focus:ring-blue-500/20"
                disabled={!canManage}
              />
            </div>
          </div>

          {searchQuery ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-inner">
              {isSearching ? (
                <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Đang tìm kiếm người dùng...
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-64 divide-y divide-border/40 overflow-y-auto">
                  {results.map((u) => {
                    const already = existingUserIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => openConfirm(u)}
                        disabled={already || addMemberMutation.isPending}
                        className={
                          "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-blue-500/5 disabled:cursor-not-allowed disabled:opacity-60 " +
                          (!canManage ? "opacity-60" : "")
                        }
                      >
                        <Avatar className="h-9 w-9">
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.displayName} /> : null}
                          <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-indigo-600 text-xs font-bold text-white">
                            {getInitials(u.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{u.displayName}</div>
                          <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {already ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Đã tham gia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <UserPlus className="h-3.5 w-3.5" /> Mời
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Không tìm thấy người dùng nào phù hợp với từ khóa <span className="font-semibold text-foreground">"{searchQuery}"</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              Mẹo: Mọi người dùng đã đăng ký tài khoản trên hệ thống đều có thể được tìm thấy bằng email.
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmWithRoleDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={selected ? `Thêm ${selected.displayName} vào workspace?` : "Thêm thành viên"}
        description={selected ? selected.email : undefined}
        confirmText="Thêm ngay"
        roleLabel="Chọn vai trò"
        allowOwner={false}
        defaultRole="MEMBER"
        loading={addMemberMutation.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
};
